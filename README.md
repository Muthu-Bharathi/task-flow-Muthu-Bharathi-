# 📝 TaskFlow

A modern, lightweight task management system. TaskFlow allows you to create projects, add tasks, and assign them out easily.

---

## 🚀 Running Locally

Assume the reviewer has **Docker** (and Docker Compose) installed and nothing else. Follow these exact commands to get the app running:

```bash
git clone https://github.com/trivine/taskflow-trivine
cd taskflow-trivine
cp .env.example .env
docker compose up -d --build
# App available at http://localhost:3000
```

*Note: The backend automatically handles all database migrations and data seeding on startup.*

---

## 🔑 Test User Credentials

Once the application is running, you can log in immediately with the following pre-seeded test account:

- **Email:** `test@example.com`
- **Password:** `password123`

---

## 💻 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Component Library:** **shadcn/ui** & **Radix UI** (for accessible, premium components)
- **Backend:** Go (`go-chi/chi` for routing), `sqlx`
- **Database:** PostgreSQL
- **Real-time:** Server-Sent Events (SSE) for live task updates
- **Infrastructure:** Docker & Docker Compose

---

## ✨ Features

- **Drag-and-Drop**: Seamlessly reorder tasks and change their status columns.
- **Real-time Updates**: Instant synchronization across multiple windows via SSE.
- **Dark Mode**: Persisted dark/light mode toggle.
- **Premium UI**: Modern glassmorphism design with shadcn/ui.
- **Responsive**: Fully optimized for mobile (375px) and desktop (1280px).

## 🔌 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| **POST** | `/auth/register` | Register a new user |
| **POST** | `/auth/login` | Login and get JWT token |
| **GET**  | `/projects` | View all projects |
| **POST** | `/projects` | Create a new project |
| **GET**  | `/projects/:id` | View specific project details |
| **PATCH**| `/projects/:id` | Update project |
| **DELETE**| `/projects/:id` | Delete project |
| **GET**  | `/projects/:id/tasks` | Get tasks for a project |
| **POST** | `/projects/:id/tasks` | Create a new task |
| **PATCH**| `/tasks/:id` | Update a task status/assignee |
| **DELETE**| `/tasks/:id` | Delete a task |

---

## 🏛️ Architecture & Decision Making

### Backend (Go + sqlx)
- **Choice of Go**: Go’s lightweight concurrency (goroutines) made it the perfect choice for the real-time SSE Hub. It allows the server to maintain thousands of open connections with minimal resource overhead.
- **sqlx over GORM**: I opted for `sqlx` to maintain full control over SQL queries. This ensures highly optimized joins (like fetching task creators and assignees in a single query) and keeps the database logic transparent and reviewable.
- **SSE vs WebSockets**: For a task manager where communication is primarily one-way (server-to-client updates), **Server-Sent Events** were chosen for their simplicity, automatic reconnection logic, and lower overhead compared to full-duplex WebSockets.

### Frontend (React + shadcn/ui)
- **Modern UI/UX**: Used a glassmorphic design system with a focus on "strategic briefings" rather than simple cards to give it a premium, professional feel.
- **State Management**: Leveraged React Context for Auth and Theme to avoid prop-drilling, while local state handles highly interactive board logic and optimistic updates for Drag-and-Drop.

---

## 🚧 What's Missing / Next Steps

1. **Unit & Integration Tests**: While the core flows are manually verified, adding a Go testing suite for handlers and `vitest` for React components would be the next priority for production readiness.
2. **Enhanced Security**: Implementation of refresh tokens and CSRF protection for the SSE endpoint.
3. **Advanced Filtering**: Currently supports filtering by Status and Assignee; next steps include Date Range and Priority sorting.
4. **Soft Deletes**: Implementing `deleted_at` fields to allow for project/task recovery.

---

---

[Review the Backend Documentation](./backend/README.md) & [Review the Frontend Documentation](./frontend/README.md) for more technical details.
