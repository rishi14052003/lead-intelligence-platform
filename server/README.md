# Lead Finder Backend

Go backend for the Lead/CEO Finder platform.

It powers authentication, lead search/enrichment, saved lead management, search history, and CSV export for the frontend application.

## Highlights

- JWT-based auth flow (`signup`, `login`, `logout`, `current user`)
- Protected lead-search endpoint
- Lead persistence and retrieval from MongoDB
- Saved lead management (save, list, delete, clear)
- Search history endpoint for dashboard analytics
- CSV export endpoint
- Request logging and CORS support

## Tech Stack

- Go 1.21
- Chi Router
- MongoDB (official Go driver)
- GoQuery for HTML parsing
- `godotenv` for local environment loading

## Project Layout

```text
server/
├─ cmd/main.go            # App entrypoint
├─ configs/               # Environment config loader
├─ internal/
│  ├─ api/                # Route registration + handlers
│  ├─ database/           # MongoDB setup
│  ├─ middleware/         # Logger + auth middleware
│  ├─ models/             # Domain models
│  ├─ scraper/            # Search/scraping helpers
│  ├─ services/           # Business logic
│  └─ utils/              # Shared utility functions
└─ go.mod
```

## Prerequisites

- Go 1.21+
- MongoDB (local or Atlas)

## Environment Variables

Create `server/.env` (you can copy from `server/.env.example`):

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=leadfinder
SERVER_PORT=8080
ENVIRONMENT=development
CLIENT_URL=http://localhost:5173
GROK_API_KEY=
SERPER_API_KEY=
```

## Run Locally

```bash
cd server
go mod download
go run cmd/main.go
```

Server starts on `http://localhost:8080` by default.

## Core Routes

### Public

- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`

### Protected (Bearer token required)

- `GET /auth/user`
- `POST /search`
- `GET /history`
- `GET /leads`
- `GET /leads/company/{id}`
- `POST /leads/save`
- `DELETE /leads`
- `GET /export`
- `GET /export/csv`

## Common Commands

```bash
# format
go fmt ./...

# vet
go vet ./...

# tests
go test ./...
```

## Notes

- CORS is configured to allow the configured `CLIENT_URL` plus common local dev origins.
- If `GROK_API_KEY` is unset, the server still runs; AI enrichment features are simply not enabled.
- Frontend and backend should run together for full dashboard/search/saved-lead functionality.

## Troubleshooting

- **MongoDB connection fails**: verify `MONGO_URI`, DB availability, and Atlas network allowlist.
- **Auth issues (401)**: check token forwarding from frontend and `Authorization` header.
- **CORS errors**: ensure your frontend origin matches `CLIENT_URL` or allowed origins in `cmd/main.go`.
