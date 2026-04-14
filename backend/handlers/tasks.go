package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"taskflow-backend/models"
	"taskflow-backend/utils"

	"github.com/go-chi/chi/v5"
	"github.com/jmoiron/sqlx"
)

type TasksHandler struct {
	DB  *sqlx.DB
	Hub *utils.Hub
}

type CreateTaskReq struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"`
	AssigneeID  *string `json:"assignee_id"`
	DueDate     *string `json:"due_date"`
}

type UpdateTaskReq struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	Priority    *string `json:"priority"`
	AssigneeID  *string `json:"assignee_id"`
	DueDate     *string `json:"due_date"`
}

func (h *TasksHandler) List(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	// Authorization check
	var hasAccess bool
	err := h.DB.Get(&hasAccess, `
		SELECT EXISTS (
			SELECT 1 FROM projects p WHERE p.id = $1 AND p.owner_id = $2
			UNION
			SELECT 1 FROM tasks t WHERE t.project_id = $1 AND t.assignee_id = $2
		)`, projectID, userID)
	
	if err != nil || !hasAccess {
		utils.ErrorResponse(w, http.StatusForbidden, "forbidden")
		return
	}

	status := r.URL.Query().Get("status")
	assignee := r.URL.Query().Get("assignee")

	query := `
		SELECT t.*, u.name as assignee_name, c.name as creator_name 
		FROM tasks t 
		LEFT JOIN users u ON t.assignee_id = u.id 
		LEFT JOIN users c ON t.creator_id = c.id
		WHERE t.project_id = $1
	`
	args := []interface{}{projectID}
	argID := 2

	if status != "" {
		query += " AND t.status = $" + string(rune('0'+argID))
		args = append(args, status)
		argID++
	}
	if assignee != "" {
		query += " AND t.assignee_id = $" + string(rune('0'+argID))
		args = append(args, assignee)
		argID++
	}

	query += " ORDER BY t.created_at ASC"

	var tasks []models.Task
	err = h.DB.Select(&tasks, query, args...)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to get tasks")
		return
	}

	if tasks == nil {
		tasks = []models.Task{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"tasks": tasks})
}

func (h *TasksHandler) Create(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	var req CreateTaskReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Title == "" {
		utils.ValidationError(w, map[string]string{"title": "is required"})
		return
	}

	// Must have access to project (only owner or assignee can create task? usually just owner, let's allow project owner)
	var ownerID string
	err := h.DB.Get(&ownerID, "SELECT owner_id FROM projects WHERE id = $1", projectID)
	if err == sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusNotFound, "project not found")
		return
	}
	if ownerID != userID {
		utils.ErrorResponse(w, http.StatusForbidden, "forbidden, only owner can create tasks")
		return
	}

	priority := "medium"
	if req.Priority != "" {
		priority = req.Priority
	}

	var task models.Task
	err = h.DB.QueryRowx(`
		WITH inserted AS (
			INSERT INTO tasks (title, description, priority, assignee_id, due_date, project_id, creator_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
		)
		SELECT i.*, u.name as assignee_name, c.name as creator_name 
		FROM inserted i 
		LEFT JOIN users u ON i.assignee_id = u.id
		LEFT JOIN users c ON i.creator_id = c.id
	`, req.Title, req.Description, priority, req.AssigneeID, req.DueDate, projectID, userID).StructScan(&task)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to create task")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, task)
	h.Hub.Notify(utils.SSEMsg{Type: "task_created", ProjectID: projectID, Data: task})
}

func (h *TasksHandler) Update(w http.ResponseWriter, r *http.Request) {
	taskID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	var req UpdateTaskReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var task models.Task
	err := h.DB.QueryRowx(`
		SELECT t.*, u.name as assignee_name, c.name as creator_name 
		FROM tasks t 
		LEFT JOIN users u ON t.assignee_id = u.id 
		LEFT JOIN users c ON t.creator_id = c.id
		WHERE t.id = $1
	`, taskID).StructScan(&task)
	if err == sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusNotFound, "not found")
		return
	}

	var ownerID string
	err = h.DB.Get(&ownerID, "SELECT owner_id FROM projects WHERE id = $1", task.ProjectID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "error checking project")
		return
	}

	isAssignee := task.AssigneeID != nil && *task.AssigneeID == userID
	isCreator := task.CreatorID == userID
	if ownerID != userID && !isAssignee && !isCreator {
		utils.ErrorResponse(w, http.StatusForbidden, "forbidden")
		return
	}

	if req.Title != nil { task.Title = *req.Title }
	if req.Description != nil { task.Description = *req.Description }
	if req.Status != nil { task.Status = *req.Status }
	if req.Priority != nil { task.Priority = *req.Priority }
	
	// Need carefully handle assignee and dueDate to allow null
	if req.AssigneeID != nil { 
		if *req.AssigneeID == "" {
			task.AssigneeID = nil
		} else {
			task.AssigneeID = req.AssigneeID 
		}
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			task.DueDate = nil
		} else {
			task.DueDate = req.DueDate 
		}
	}
	task.UpdatedAt = time.Now()

	err = h.DB.QueryRowx(`
		WITH updated AS (
			UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4, assignee_id=$5, due_date=$6, updated_at=$7 WHERE id=$8 RETURNING *
		)
		SELECT u_task.*, u_user.name as assignee_name, c_user.name as creator_name 
		FROM updated u_task 
		LEFT JOIN users u_user ON u_task.assignee_id = u_user.id
		LEFT JOIN users c_user ON u_task.creator_id = c_user.id
	`, task.Title, task.Description, task.Status, task.Priority, task.AssigneeID, task.DueDate, task.UpdatedAt, taskID).StructScan(&task)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to update task")
		return
	}

	utils.JSONResponse(w, http.StatusOK, task)
	h.Hub.Notify(utils.SSEMsg{Type: "task_updated", ProjectID: task.ProjectID, Data: task})
}

func (h *TasksHandler) Delete(w http.ResponseWriter, r *http.Request) {
	taskID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	var taskInfo struct {
		ProjectID string `db:"project_id"`
		CreatorID string `db:"creator_id"`
	}
	err := h.DB.Get(&taskInfo, "SELECT project_id, creator_id FROM tasks WHERE id = $1", taskID)
	if err == sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusNotFound, "not found")
		return
	}

	var ownerID string
	err = h.DB.Get(&ownerID, "SELECT owner_id FROM projects WHERE id = $1", taskInfo.ProjectID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "error checking project")
		return
	}

	if ownerID != userID && taskInfo.CreatorID != userID {
		utils.ErrorResponse(w, http.StatusForbidden, "forbidden, only project owner or task creator can delete tasks")
		return
	}

	_, err = h.DB.Exec("DELETE FROM tasks WHERE id = $1", taskID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to delete task")
		return
	}

	w.WriteHeader(http.StatusNoContent)
	h.Hub.Notify(utils.SSEMsg{Type: "task_deleted", ProjectID: taskInfo.ProjectID, Data: taskID})
}
