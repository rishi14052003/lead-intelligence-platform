import api from "./api";

export interface Lead {
  id?: string;
  name: string;
  role: string;
  email?: string;
  linkedin?: string;
  score?: number;
  company?: string;
  createdAt?: string;
}

export async function searchLeads(query: string): Promise<Lead[]> {
  try {
    const response = await api.post("/search", { query });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || "Search failed");
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
