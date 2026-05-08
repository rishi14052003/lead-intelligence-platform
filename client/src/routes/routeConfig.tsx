import SearchPage from '../pages/Search';
import Results from '../pages/Results';
import Dashboard from '../pages/Dashboard';
import SavedLeads from '../pages/SavedLeads';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import ProfileSettings from '../pages/ProfileSettings';
import ForgotPassword from '../pages/ForgotPassword';
import VerifyOtp from '../pages/VerifyOtp';
import ResetPassword from '../pages/ResetPassword';

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
  {
    path: '/forgot-password',
    element: ForgotPassword,
  },
  {
    path: '/verify-otp',
    element: VerifyOtp,
  },
  {
    path: '/reset-password',
    element: ResetPassword,
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
    path: '/profile-settings',
    element: ProfileSettings,
    layout: false,
  },
];

// Default redirect based on authentication
export const getDefaultRoute = (isAuthenticated: boolean) => {
  return isAuthenticated ? '/dashboard' : '/login';
};
