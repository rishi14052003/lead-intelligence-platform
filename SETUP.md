# Complete Setup Guide - Lead/CEO Finder Tool

This guide walks you through setting up the entire application (frontend + backend) from scratch.

## Prerequisites

- **Go**: 1.21 or higher ([Download](https://golang.org/dl/))
- **Node.js**: 18.0 or higher ([Download](https://nodejs.org/))
- **MongoDB**: 4.4 or higher ([Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git**: Latest version

## Project Structure

```
Go-Lead-CEO-Finder-Tool/
├── client/                 # React/TypeScript Frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── server/                 # Go Backend
    ├── cmd/
    ├── internal/
    ├── go.mod
    └── go.sum
```

## Part 1: Backend Setup (Go)

### Step 1: Navigate to Server Directory

```bash
cd server
```

### Step 2: Install Go Dependencies

```bash
go mod download
```

If `go.mod` doesn't exist or has issues:

```bash
go mod init lead-finder
go mod tidy
```

### Step 3: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Local MongoDB
MONGO_URI=mongodb://localhost:27017
DB_NAME=leadfinder

# Or MongoDB Atlas
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/leadfinder?retryWrites=true&w=majority

SERVER_PORT=8080
ENVIRONMENT=development
CLIENT_URL=http://localhost:5173
```

### Step 4: Start MongoDB

**Option A: Local MongoDB**

```bash
# macOS with Homebrew
brew services start mongodb-community

# Windows (if installed)
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"

# Linux
sudo systemctl start mongod
```

**Option B: MongoDB Atlas** (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string: `mongodb+srv://...`
4. Update `MONGO_URI` in `.env`

### Step 5: Run the Backend

```bash
go run cmd/main.go
```

You should see:

```
✓ Connected to MongoDB successfully
✓ Database indexes created
✓ Server running on https://lead-intelligence-platform.onrender.com
```

**Test the backend**:

```bash
curl https://lead-intelligence-platform.onrender.com/health
# Response: {"status": "ok"}
```

**Keep this terminal open**. The backend runs on port 8080.

## Part 2: Frontend Setup (React/TypeScript)

### Step 1: Open New Terminal

```bash
cd client
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start Development Server

```bash
npm run dev
```

You should see:

```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Part 3: Testing the Integration

### 1. Open Frontend

Navigate to `http://localhost:5173` in your browser.

### 2. Test Search

1. Go to the "Search" page
2. Enter a company domain (e.g., `tesla.com`, `google.com`)
3. Click "Search"
4. The frontend will call the backend, which will:
   - Scrape the website
   - Search Google for executives
   - Search LinkedIn for profiles
   - Save results to MongoDB

### 3. View Results

Results will display in the "Results" page showing:
- Lead name
- Role
- Email
- LinkedIn profile
- Score (1-100)

### 4. Export Data

Click "Export" to download leads as CSV.

## API Endpoints Quick Reference

### Health Check

```bash
curl https://lead-intelligence-platform.onrender.com/health
```

### Search

```bash
curl -X POST https://lead-intelligence-platform.onrender.com/search \
  -H "Content-Type: application/json" \
  -d '{"query": "tesla.com"}'
```

### Get Leads

```bash
curl https://lead-intelligence-platform.onrender.com/leads

# Filter by role
curl https://lead-intelligence-platform.onrender.com/leads?role=CEO
```

### Export

```bash
curl https://lead-intelligence-platform.onrender.com/export > leads.csv
```

## Development Workflow

### Backend Development

1. Make changes to Go files
2. Backend auto-reloads? No, you need to restart:

```bash
# Stop the server (Ctrl+C)
# Run again
go run cmd/main.go
```

For auto-reload, install `air`:

```bash
go install github.com/cosmtrek/air@latest
air
```

### Frontend Development

Frontend automatically reloads on file changes via Vite hot module replacement.

### Database

View data in MongoDB:

**Using MongoDB CLI**:

```bash
mongosh
use leadfinder
db.leads.find()
db.searches.find()
```

**Using MongoDB Atlas**:
- Log in to [Atlas](https://cloud.mongodb.com)
- Click "Browse Collections"
- View data

## Troubleshooting

### Issue: "Failed to connect to MongoDB"

**Solutions**:
- Check MongoDB is running: `mongosh` or `mongo`
- Verify `MONGO_URI` in `.env`
- For Atlas, whitelist your IP: Atlas → Network Access

### Issue: CORS Error in Frontend

**Solution**:
- Backend CORS is configured for `http://localhost:5173`
- If using different port, update `CLIENT_URL` in backend `.env`

### Issue: Search Returns No Results

**Solutions**:
- Check internet connection
- Try different domain
- Check backend logs for errors
- Increase timeout in `lead_service.go` (line ~31)

### Issue: Port Already in Use

Backend on 8080:

```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>
```

Frontend on 5173:

```bash
npm run dev -- --port 3000
```

### Issue: Go mod errors

```bash
# Clean and download
go clean -modcache
go mod download
go mod tidy
```

## Production Deployment

### Option 1: Deploy Backend (Heroku, Railway, etc.)

```bash
# Build binary
go build -o lead-finder cmd/main.go

# Set environment variables in hosting platform
MONGO_URI=...
SERVER_PORT=8080
CLIENT_URL=https://yourdomain.com
```

### Option 2: Deploy Frontend (Vercel, Netlify, etc.)

```bash
npm run build

# Deploy the dist/ folder
```

### Option 3: Docker (All-in-One)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build:
      context: ./server
    ports:
      - "8080:8080"
    environment:
      MONGO_URI: mongodb://mongodb:27017
      CLIENT_URL: http://localhost:5173
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./client
    ports:
      - "5173:5173"

volumes:
  mongo_data:
```

Run:

```bash
docker-compose up
```

## Project Architecture

### Frontend (React)

```
src/
├── pages/           # Page components
├── components/      # Reusable components
├── services/        # API calls
├── store/           # State management (Zustand)
├── hooks/           # Custom React hooks
└── utils/           # Utility functions
```

### Backend (Go)

```
internal/
├── api/             # HTTP handlers & routes
├── services/        # Business logic
├── scraper/         # Web scraping
├── models/          # Data models
├── database/        # MongoDB connection
├── middleware/      # HTTP middleware
└── utils/           # Utility functions
```

## Next Steps

1. ✅ Backend setup complete
2. ✅ Frontend setup complete
3. 🚀 Ready for development

### Enhance the Project

- [ ] Add authentication
- [ ] Implement caching (Redis)
- [ ] Add rate limiting
- [ ] Deploy to cloud
- [ ] Add more scraping sources
- [ ] Implement advanced analytics
- [ ] Add team collaboration features

## Resources

- [Go Documentation](https://golang.org/doc/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Chi Router Guide](https://github.com/go-chi/chi)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

## Support

For issues:
1. Check this guide
2. Check backend `README.md`
3. Review error logs
4. Create GitHub issue

---

**Happy Coding! 🚀**
