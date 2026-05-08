import type { Lead } from "./searchService";

const SEARCH_RESULTS_KEY = "searchResults";

export interface StoredSearchResults {
  query: string;
  location?: string;
  results: Lead[];
  timestamp: number;
}

/**
 * Save search results to localStorage with query and location
 */
export function saveSearchResultsToStorage(query: string, results: Lead[], location?: string): void {
  try {
    const data: StoredSearchResults = {
      query,
      ...(location && { location }),
      results,
      timestamp: Date.now(),
    };
    localStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(data));
    console.log("✅ Search results saved to localStorage");
  } catch (error) {
    console.error("❌ Failed to save search results to localStorage:", error);
  }
}

/**
 * Get search results from localStorage
 */
export function getSearchResultsFromStorage(): StoredSearchResults | null {
  try {
    const data = localStorage.getItem(SEARCH_RESULTS_KEY);
    if (!data) return null;
    
    const parsed: StoredSearchResults = JSON.parse(data);
    console.log("✅ Search results retrieved from localStorage");
    return parsed;
  } catch (error) {
    console.error("❌ Failed to retrieve search results from localStorage:", error);
    return null;
  }
}

/**
 * Clear search results from localStorage
 */
export function clearSearchResultsFromStorage(): void {
  try {
    localStorage.removeItem(SEARCH_RESULTS_KEY);
    console.log("✅ Search results cleared from localStorage");
  } catch (error) {
    console.error("❌ Failed to clear search results from localStorage:", error);
  }
}

/**
 * Check if stored results are still valid (optional: max age in hours)
 */
export function isSearchResultsValid(maxAgeHours: number = 24): boolean {
  const stored = getSearchResultsFromStorage();
  if (!stored) return false;
  
  const ageInHours = (Date.now() - stored.timestamp) / (1000 * 60 * 60);
  return ageInHours < maxAgeHours;
}
