# Lead/CEO Finder Tool - Backend

A production-ready Go backend for a SaaS Lead and CEO Finder tool with web scraping, data enrichment, and MongoDB integration.

## Features

- **Web Scraping**: Extract emails and names from websites
- **Google Search Integration**: Find CEO/CTO/Leadership information via Google
- **LinkedIn Profile Matching**: Match leads with LinkedIn profiles
- **Smart Scoring**: Automatic role-based scoring system
- **MongoDB Storage**: Persist leads and search history
- **CSV Export**: Export leads as CSV files
- **REST API**: Clean, well-documented REST endpoints
- **Middleware**: Logger and CORS support
- **Error Handling**: Comprehensive error handling and validation

## Tech Stack

- **Language**: Go 1.21+
- **Web Framework**: Chi Router
- **Database**: MongoDB
- **HTTP Client**: Go-Resty
- **HTML Parsing**: GoQuery

## Project Structure

```
server/
├── cmd/
│   └── main.go              # Application entry point
├── configs/
│   └── config.go            # Configuration management
├── internal/
│   ├── api/
│   │   ├── routes.go        # API routes
│   │   ├── search_handler.go # Search endpoint
│   │   ├── lead_handler.go   # Leads endpoints
│   │   └── export_handler.go # Export endpoint
│   ├── database/
│   │   └── db.go            # MongoDB connection
│   ├── middleware/
│   │   ├── logger.go        # Request logging
│   │   └── auth.go          # Authentication (placeholder)
│   ├── models/
│   │   ├── lead.go          # Lead model
│   │   ├── search.go        # Search model
│   │   └── user.go          # User model
│   ├── scraper/
│   │   ├── website_scraper.go    # Website scraping
│   │   ├── google_scraper.go     # Google search
│   │   └── linkedin_parser.go    # LinkedIn extraction
│   ├── services/
│   │   ├── lead_service.go  # Lead orchestration
│   │   ├── email_service.go # Email sending
│   │   └── scoring_service.go # Lead scoring
│   └── utils/
│       ├── parser.go        # Text parsing utilities
│       ├── formatter.go     # Text formatting utilities
│       └── validator.go     # Input validation
├── .env.example             # Example environment variables
├── go.mod                   # Go module definition
└── README.md               # This file
```

## Prerequisites

- Go 1.21 or higher
- MongoDB 4.4 or higher (local or Atlas)
- Git

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd server
```

### 2. Install Dependencies

```bash
go mod download
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=leadfinder
SERVER_PORT=8080
ENVIRONMENT=development
CLIENT_URL=http://localhost:5173
```

For MongoDB Atlas, use:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/leadfinder?retryWrites=true&w=majority
```

### 4. Start MongoDB (if running locally)

```bash
mongod
```

### 5. Run the Server

```bash
go run cmd/main.go
```

The server will start on `http://localhost:8080`

## API Endpoints

### 1. Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok"
}
```

### 2. Search and Enrich Leads

```
POST /search
Content-Type: application/json

{
  "query": "tesla.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": [
    {
      "id": "...",
      "name": "Elon Musk",
      "role": "CEO",
      "email": "elon@tesla.com",
      "linkedin": "https://linkedin.com/in/elon-musk",
      "score": 95,
      "company": "Tesla",
      "searchId": "...",
      "createdAt": "2024-04-23T10:00:00Z"
    }
  ]
}
```

### 3. Get All Leads

```
GET /leads
```

Optional query parameters:
- `role`: Filter by role (e.g., `?role=CEO`)

Response:
```json
{
  "success": true,
  "message": "Leads fetched successfully",
  "data": [...],
  "count": 25
}
```

### 4. Export Leads as CSV

```
GET /export
```

Returns a downloadable CSV file with headers:
- Name
- Role
- Email
- LinkedIn
- Score
- Company
- Created At

### 5. Delete Lead

```
DELETE /leads?id=<lead_id>
```

Response:
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

## Scoring System

Leads are automatically scored based on their role:

- **CEO/Founder/President/Owner**: 95 points
- **C-Level (CTO, CFO, CIO, etc)**: 90 points
- **VP/Director**: 85 points
- **HR/Recruitment**: 80 points
- **Sales/Business Development**: 75 points
- **Finance**: 75 points
- **Technical/Engineering**: 70 points
- **Marketing**: 70 points
- **Manager**: 75 points
- **Operations**: 65 points
- **Other**: 60 points

**Bonus Points:**
- LinkedIn profile found: +5 points
- Email found: +5 points

**Maximum Score**: 100 points

## Data Models

### Lead

```go
type Lead struct {
  ID        ObjectID   `bson:"_id"`
  Name      string     `bson:"name"`
  Role      string     `bson:"role"`
  Email     string     `bson:"email"`
  LinkedIn  string     `bson:"linkedin"`
  Score     int        `bson:"score"`
  Company   string     `bson:"company"`
  SearchID  ObjectID   `bson:"searchId"`
  CreatedAt time.Time  `bson:"createdAt"`
  UpdatedAt time.Time  `bson:"updatedAt"`
}
```

### Search

```go
type Search struct {
  ID           ObjectID   `bson:"_id"`
  Query        string     `bson:"query"`
  Domain       string     `bson:"domain"`
  ResultsCount int        `bson:"resultsCount"`
  CreatedAt    time.Time  `bson:"createdAt"`
}
```

## Database Indexes

The application automatically creates the following indexes:

- `leads.email` (unique)
- `searches.query` (for faster lookup)

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (validation error)
- `404`: Not Found
- `500`: Internal Server Error

Error Response Format:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Development

### Running Tests

```bash
go test ./...
```

### Code Style

Follow Go conventions:

```bash
go fmt ./...
go vet ./...
```

## Production Deployment

### 1. Build Binary

```bash
go build -o lead-finder cmd/main.go
```

### 2. Run in Background

```bash
nohup ./lead-finder > server.log 2>&1 &
```

### 3. Using Docker (Optional)

Create a `Dockerfile`:

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY . .
RUN go build -o lead-finder cmd/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /build/lead-finder .
EXPOSE 8080
CMD ["./lead-finder"]
```

Build and run:

```bash
docker build -t lead-finder .
docker run -p 8080:8080 -e MONGO_URI="..." lead-finder
```

## Troubleshooting

### MongoDB Connection Error

**Error**: `failed to connect to MongoDB`

**Solution**:
- Ensure MongoDB is running: `mongod`
- Check `MONGO_URI` in `.env`
- For Atlas, ensure IP whitelist includes your machine

### Search Returns No Results

- Check domain is valid
- Increase timeout in `lead_service.go`
- Verify internet connection for scraping

### Slow Searches

- MongoDB indexes may not be created: check logs
- Consider adding caching
- Reduce `maxLeads` value in `lead_service.go`

## Performance Tips

1. **Database Optimization**:
   - Ensure indexes are created
   - Use pagination for large result sets
   - Archive old searches

2. **Scraping Optimization**:
   - Implement request caching
   - Add rate limiting for external APIs
   - Use goroutines for concurrent scraping

3. **API Optimization**:
   - Add response caching
   - Implement request batching
   - Use connection pooling for MongoDB

## Security Considerations

1. **Input Validation**: All inputs are validated and sanitized
2. **CORS**: Configured for frontend communication
3. **Error Messages**: Generic error messages in production
4. **Database**: MongoDB should be in a private network
5. **Credentials**: Never commit `.env` file

## Future Enhancements

- [ ] Authentication & Authorization
- [ ] Rate limiting
- [ ] Caching layer (Redis)
- [ ] Advanced search filters
- [ ] Batch search API
- [ ] Webhook notifications
- [ ] Analytics dashboard
- [ ] Custom scoring rules
- [ ] Lead enrichment via third-party APIs
- [ ] Duplicate detection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues or questions, open a GitHub issue or contact support.
