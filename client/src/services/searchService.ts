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

export async function searchLeads(query: string, location?: string): Promise<Lead[]> {
  try {
    const requestBody = {
      query,
      ...(location && { location }), // Include location only if provided
    };

    const response = await api.post("/search", requestBody);
    
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
