/**
 * Centralized configuration for the entire application
 * All environment-specific settings are loaded from here
 * Change environment variables in .env file instead of hardcoding in source
 */

export const config = {
  // API Configuration - loaded from .env
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  },

  // Application settings
  app: {
    name: 'Lead Finder',
    version: '1.0.0',
  },

  // Feature flags (can be added later)
  features: {
    enableAnalytics: true,
    enableDebugLogs: import.meta.env.DEV,
  },
} as const;

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('App Config:', {
    apiBaseURL: config.api.baseURL,
    isDev: import.meta.env.DEV,
  });
}

export default config;
