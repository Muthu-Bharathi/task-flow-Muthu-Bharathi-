package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"taskflow-backend/models"
	"taskflow-backend/utils"

	"github.com/go-chi/chi/v5"
	"github.com/jmoiron/sqlx"
)

type ProjectsHandler struct {
	DB  *sqlx.DB
	Hub *utils.Hub
}

type CreateProjectReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type UpdateProjectReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (h *ProjectsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	var projects []models.Project
	query := `
		SELECT DISTINCT p.* FROM projects p
		LEFT JOIN tasks t ON t.project_id = p.id
		WHERE p.owner_id = $1 OR t.assignee_id = $1
		ORDER BY p.created_at DESC
	`
	err := h.DB.Select(&projects, query, userID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to get projects")
		return
	}

	if projects == nil {
		projects = []models.Project{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"projects": projects})
}

func (h *ProjectsHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	var req CreateProjectReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		utils.ValidationError(w, map[string]string{"name": "is required"})
		return
	}

	var project models.Project
	err := h.DB.QueryRowx(
		"INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *",
		req.Name, req.Description, userID,
	).StructScan(&project)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to create project")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, project)
}

func (h *ProjectsHandler) Get(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	var project models.Project
	err := h.DB.QueryRowx("SELECT * FROM projects WHERE id = $1", projectID).StructScan(&project)
	if err == sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to get project")
		return
	}

	// Check access
	var hasAccess bool
	err = h.DB.Get(&hasAccess, `
		SELECT EXISTS (
			SELECT 1 FROM projects p WHERE p.id = $1 AND p.owner_id = $2
			UNION
			SELECT 1 FROM tasks t WHERE t.project_id = $1 AND t.assignee_id = $2
		)`, projectID, userID)
	
	if err != nil || !hasAccess {
		utils.ErrorResponse(w, http.StatusForbidden, "forbidden")
		return
	}

	var tasks []models.Task
	err = h.DB.Select(&tasks, `
		SELECT t.*, u.name as assignee_name, c.name as creator_name 
		FROM tasks t 
		LEFT JOIN users u ON t.assignee_id = u.id 
		LEFT JOIN users c ON t.creator_id = c.id
		WHERE t.project_id = $1 
		ORDER BY t.created_at ASC
	`, projectID)
	if err != nil && err != sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to get tasks")
		return
	}

	if tasks == nil {
		tasks = []models.Task{}
	}
	project.Tasks = tasks

	utils.JSONResponse(w, http.StatusOK, project)
}

func (h *ProjectsHandler) Update(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	var req UpdateProjectReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// must be owner
	var ownerID string
	err := h.DB.Get(&ownerID, "SELECT owner_id FROM projects WHERE id = $1", projectID)
	if err == sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusNotFound, "not found")
		return
	}
	if ownerID != userID {
		utils.ErrorResponse(w, http.StatusForbidden, "forbidden")
		return
	}

	var project models.Project
	err = h.DB.QueryRowx(
		"UPDATE projects SET name = COALESCE(NULLIF($1, ''), name), description = $2 WHERE id = $3 RETURNING *",
		req.Name, req.Description, projectID,
	).StructScan(&project)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to update project")
		return
	}

	utils.JSONResponse(w, http.StatusOK, project)
}

func (h *ProjectsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	// must be owner
	var ownerID string
	err := h.DB.Get(&ownerID, "SELECT owner_id FROM projects WHERE id = $1", projectID)
	if err == sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusNotFound, "not found")
		return
	}
	if ownerID != userID {
		utils.ErrorResponse(w, http.StatusForbidden, "forbidden")
		return
	}

	_, err = h.DB.Exec("DELETE FROM projects WHERE id = $1", projectID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to delete project")
		return
	}

	w.WriteHeader(http.StatusNoContent)
	h.Hub.Notify(utils.SSEMsg{Type: "project_deleted", ProjectID: projectID, Data: projectID})
}
