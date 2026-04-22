import api from "./api";

export interface Lead {
  name: string;
  role: string;
  email?: string;
  linkedin?: string;
  score?: number;
}

export async function searchLeads(query: string) {
  const resp = await api.post<{ leads: Lead[] }>("/search", { query });
  return resp.data.leads;
}
