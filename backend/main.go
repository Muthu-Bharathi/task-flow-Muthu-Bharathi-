package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"taskflow-backend/db"
	"taskflow-backend/handlers"
	"taskflow-backend/utils"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	database := db.InitDB()
	defer database.Close()

	hub := utils.NewHub()
	go hub.Run()

	authHandler := &handlers.AuthHandler{DB: database}
	projectsHandler := &handlers.ProjectsHandler{DB: database, Hub: hub}
	tasksHandler := &handlers.TasksHandler{DB: database, Hub: hub}

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/events", hub.ServeHTTP)

	r.Route("/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
		r.With(handlers.AuthMiddleware).Get("/users", authHandler.ListUsers)
	})

	r.Route("/projects", func(r chi.Router) {
		r.Use(handlers.AuthMiddleware)
		
		r.Get("/", projectsHandler.List)
		r.Post("/", projectsHandler.Create)
		
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", projectsHandler.Get)
			r.Patch("/", projectsHandler.Update)
			r.Delete("/", projectsHandler.Delete)

			r.Route("/tasks", func(r chi.Router) {
				r.Get("/", tasksHandler.List)
				r.Post("/", tasksHandler.Create)
			})
		})
	})

	r.Route("/tasks", func(r chi.Router) {
		r.Use(handlers.AuthMiddleware)
		r.Route("/{id}", func(r chi.Router) {
			r.Patch("/", tasksHandler.Update)
			r.Delete("/", tasksHandler.Delete)
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Printf("Starting backend server on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}
