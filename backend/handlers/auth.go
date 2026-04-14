package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"taskflow-backend/models"
	"taskflow-backend/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB *sqlx.DB
}

type RegisterReq struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "supersecretkey123"
	}
	return secret
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := make(map[string]string)
	if req.Name == "" {
		fields["name"] = "is required"
	}
	if req.Email == "" {
		fields["email"] = "is required"
	}
	if req.Password == "" {
		fields["password"] = "is required"
	}
	if len(fields) > 0 {
		utils.ValidationError(w, fields)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	var user models.User
	err = h.DB.QueryRowx(
		"INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
		req.Name, req.Email, string(hashed),
	).StructScan(&user)

	if err != nil {
		if strings.Contains(err.Error(), "unique constraint") {
			utils.ValidationError(w, map[string]string{"email": "already exists"})
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "could not create user")
		return
	}

	token, _ := generateJWT(user.ID, user.Email)

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := make(map[string]string)
	if req.Email == "" {
		fields["email"] = "is required"
	}
	if req.Password == "" {
		fields["password"] = "is required"
	}
	if len(fields) > 0 {
		utils.ValidationError(w, fields)
		return
	}

	var user models.User
	err := h.DB.QueryRowx("SELECT id, name, email, password, created_at FROM users WHERE email = $1", req.Email).StructScan(&user)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	token, _ := generateJWT(user.ID, user.Email)
	user.Password = ""

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	err := h.DB.Select(&users, "SELECT id, name, email, created_at FROM users ORDER BY name ASC")
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "failed to get users")
		return
	}
	if users == nil {
		users = []models.User{}
	}
	utils.JSONResponse(w, http.StatusOK, users)
}

func generateJWT(userID, email string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})
	return token.SignedString([]byte(getJWTSecret()))
}

// Middleware
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			utils.ErrorResponse(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return []byte(getJWTSecret()), nil
		})

		if err != nil || !token.Valid {
			utils.ErrorResponse(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			utils.ErrorResponse(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", claims["user_id"])
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
