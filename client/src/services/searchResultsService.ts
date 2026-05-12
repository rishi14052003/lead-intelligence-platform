import type { Lead } from "./searchService";
import api from "./api";

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

/**
 * Save search results to database for the current user
 */
export async function saveSearchResultsToDatabase(query: string, leads: Lead[], location?: string): Promise<void> {
  try {
    console.log("💾 Saving search results to database:", { query, leadsCount: leads.length, location });
    
    const response = await api.post("/search/results", {
      query,
      leads,
      location,
    });

    if (response.data.success) {
      console.log("✅ Search results saved to database successfully");
    } else {
      throw new Error("Failed to save search results to database");
    }
  } catch (error) {
    console.error("❌ Failed to save search results to database:", error);
    throw error;
  }
}

/**
 * Get search results from database by query with timeout
 */
export async function getSearchResultsFromDatabase(query: string, timeoutMs: number = 5000): Promise<{ leads: Lead[]; query: string } | null> {
  try {
    console.log("🔍 Retrieving search results from database for query:", query);
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    // Create API call promise
    const apiPromise = api.get(`/search/results/${encodeURIComponent(query)}`);
    
    // Race between API call and timeout
    const response = await Promise.race([apiPromise, timeoutPromise]);

    if (response.data.success) {
      console.log("✅ Retrieved search results from database:", response.data.search.leads.length, "leads");
      return {
        leads: response.data.search.leads,
        query: response.data.search.query,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("❌ Failed to retrieve search results from database:", error);
    if (error instanceof Error && error.message.includes('timed out')) {
      throw new Error(`Database request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Get all search results for a company from database with timeout
 */
export async function getCompanySearchResultsFromDatabase(company: string, timeoutMs: number = 5000): Promise<Lead[]> {
  try {
    console.log("🏢 Retrieving company search results from database for:", company);
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    // Create API call promise
    const apiPromise = api.get(`/search/results/company/${encodeURIComponent(company)}`);
    
    // Race between API call and timeout
    const response = await Promise.race([apiPromise, timeoutPromise]);

    if (response.data.success) {
      console.log("✅ Retrieved company search results from database:", response.data.totalLeads, "leads from", response.data.searchCount, "searches");
      return response.data.leads;
    } else {
      return [];
    }
  } catch (error) {
    console.error("❌ Failed to retrieve company search results from database:", error);
    if (error instanceof Error && error.message.includes('timed out')) {
      throw new Error(`Company data request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}
