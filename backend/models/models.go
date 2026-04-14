package models

import "time"

type User struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type Project struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	OwnerID     string    `json:"owner_id" db:"owner_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	Tasks       []Task    `json:"tasks,omitempty" db:"-"`
}

type Task struct {
	ID          string    `json:"id" db:"id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	Status      string    `json:"status" db:"status"`
	Priority    string    `json:"priority" db:"priority"`
	ProjectID   string    `json:"project_id" db:"project_id"`
	AssigneeID   *string   `json:"assignee_id" db:"assignee_id"`
	AssigneeName *string   `json:"assignee_name" db:"assignee_name"`
	CreatorID    string    `json:"creator_id" db:"creator_id"`
	CreatorName  *string   `json:"creator_name" db:"creator_name"`
	DueDate      *string   `json:"due_date" db:"due_date"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
