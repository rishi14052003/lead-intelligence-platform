# Lead Finder Frontend

React + TypeScript + Vite frontend for the Lead/CEO Finder platform.

This app helps users search company domains, review discovered decision-makers, save high-value leads, and monitor activity from a single dashboard.

## What This Frontend Includes

- Authentication flow (`/login`, `/signup`) with persisted auth state
- Protected app routes with auto-redirect on unauthorized API responses
- Domain-based lead search and results review
- Save/unsave/delete lead management
- Dashboard insights:
  - Recent Activity
  - Top Companies
  - Performance Overview (`Searches Count`, `Leads Found`, `Leads Saved`, `Save Rate`)
- Export dropdown support (PDF, Excel, Word) in key data views
- Dark/Light mode support

## Tech Stack

- React 19
- TypeScript
- Vite
- Zustand (state management)
- React Router
- Axios
- Lucide Icons
- Export libraries: `xlsx`, `jspdf`, `jspdf-autotable`, `docx`

## Project Structure (High Level)

```text
client/
├─ src/
│  ├─ pages/          # Dashboard, Search, Results, Saved Leads, Auth pages
│  ├─ components/     # Reusable UI components
│  ├─ routes/         # Route config and protected routing
│  ├─ store/          # Zustand stores (auth, leads, history)
│  ├─ services/       # API calls
│  ├─ styles/         # Theme and layout styles
│  └─ utils/          # Export and shared utility helpers
├─ .env               # Frontend environment variables
└─ package.json
```

## Prerequisites

- Node.js 18+ (recommended 20+)
- npm
- Running backend API (see `../server/README.md`)

## Environment Variables

Create or update `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Getting Started

```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173` by default.

## Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Type-check and build production bundle
- `npm run preview` - Preview built app locally
- `npm run lint` - Run ESLint

## API Expectations

The frontend expects the backend to provide these authenticated routes:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/user`
- `POST /search`
- `GET /leads`
- `POST /leads/save`
- `DELETE /leads`
- `GET /history`
- `GET /export` or `GET /export/csv`

## Notes for Contributors

- Keep components theme-aware by using existing CSS variables (`--text1`, `--surface2`, etc.)
- Reuse shared utilities (`ExportDropdown`, `exportUtils`) before adding duplicate export logic
- Use store actions instead of direct localStorage or fetch logic in page components whenever possible

## Troubleshooting

- **401 loop / unexpected logout**: verify token is set and backend auth endpoints are reachable.
- **No data in dashboard cards**: confirm backend is running and user has search/saved history.
- **CORS errors**: ensure backend `CLIENT_URL` includes your frontend origin.
