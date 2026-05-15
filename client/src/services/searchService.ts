import api from "./api";

export interface Lead {
  id?: string;
  name: string;
  // role is the displayed job title (e.g. "Founder & CEO")
  role: string;
  matchedCategory?: string;
  email?: string;
  linkedin?: string;
  score?: number;
  company?: string;
  companyUrl?: string;
  source?: string;
  createdAt?: string;
}

// CHANGE #10: Response interface with pagination info
export interface SearchResponse {
  success: boolean;
  message: string;
  data: Lead[];
  total?: number;
  page?: number;
  hasMore?: boolean;
}

export async function searchLeads(query: string, location?: string, signal?: AbortSignal, page: number = 1): Promise<Lead[]> {
  try {
    const requestBody = {
      query,
      ...(location && { location }), // Include location only if provided
      page, // CHANGE #10: Include page number
    };

    // CHANGE #9: Pass abort signal to API request
    const response = await api.post("/search", requestBody, { signal });
    
    if (!response.data) {
      throw new Error("No response from server");
    }

    const { success, data, message } = response.data;
    
    // Check if request was successful
    if (!success) {
      throw new Error(message || "Search failed");
    }

    // Handle the response - data can be null, undefined, or an array
    if (data === null || data === undefined) {
      console.warn("Search returned no data. Returning empty array.");
      return [];
    }

    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.error("Expected array but got:", typeof data);
      return [];
    }

    return data;
  } catch (error: any) {
    // CHANGE #9: Silently handle abort errors (user cancelled the request)
    if (error.name === "AbortError") {
      console.log("🚫 Search request cancelled by user");
      return [];
    }
    console.error("Search error:", error);
    throw error;
  }
}

// CHANGE #10: New function to get full response with pagination info
export async function searchLeadsWithPagination(query: string, location?: string, signal?: AbortSignal, page: number = 1): Promise<SearchResponse> {
  try {
    const requestBody = {
      query,
      ...(location && { location }),
      page,
    };

    const response = await api.post("/search", requestBody, { signal });
    
    if (!response.data) {
      throw new Error("No response from server");
    }

    const { success, message } = response.data;
    
    if (!success) {
      throw new Error(message || "Search failed");
    }

    return response.data;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("🚫 Search request cancelled by user");
      return { success: false, message: "Cancelled", data: [] };
    }
    console.error("Search error:", error);
    throw error;
  }
}

export async function getSearchHistory() {
  try {
    const response = await api.get("/search-history");
    return response.data.data || [];
  } catch (error: any) {
    console.error("Error fetching search history:", error);
    return [];
  }
}
