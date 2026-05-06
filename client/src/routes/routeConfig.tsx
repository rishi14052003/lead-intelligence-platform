import SearchPage from '../pages/Search';
import Results from '../pages/Results';
import Dashboard from '../pages/Dashboard';
import SavedLeads from '../pages/SavedLeads';
import History from '../pages/History';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import ProfileSettings from '../pages/ProfileSettings';

// Public routes (no authentication required)
export const publicRoutes = [
  {
    path: '/login',
    element: Login,
  },
  {
    path: '/signup',
    element: Signup,
  },
];

// Protected routes (authentication required)
export const protectedRoutes = [
  {
    path: '/dashboard',
    element: Dashboard,
    layout: true,
  },
  {
    path: '/search',
    element: SearchPage,
    layout: true,
  },
  {
    path: '/results',
    element: Results,
    layout: true,
  },
  {
    path: '/saved',
    element: SavedLeads,
    layout: true,
  },
  {
    path: '/history',
    element: History,
    layout: true,
  },
  {
    path: '/profile-settings',
    element: ProfileSettings,
    layout: false,
  },
];

// Default redirect based on authentication
export const getDefaultRoute = (isAuthenticated: boolean) => {
  return isAuthenticated ? '/dashboard' : '/login';
};
