import api from "./api";
import type { Lead } from "./searchService";

export async function getSavedLeads(): Promise<Lead[]> {
	const resp = await api.get<{ leads: Lead[] }>("/leads/saved");
	return resp.data.leads;
}
