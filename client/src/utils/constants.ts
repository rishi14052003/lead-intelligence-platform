export const API_BASE_URL = "https://lead-intelligence-platform.onrender.com";

export const ROLES = [
  "CEO",
  "CTO", 
  "CFO",
  "COO",
  "CMO",
  "HR Manager",
  "Sales Manager",
  "Product Manager",
  "Engineering Manager"
] as const;

export const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 0
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const;