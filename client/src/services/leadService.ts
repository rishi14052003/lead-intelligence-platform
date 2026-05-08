import api from "./api";
import type { Lead } from "./searchService";

export async function getAllLeads(role?: string): Promise<Lead[]> {
	try {
		const params = role ? { role } : undefined;
		const response = await api.get<{ data: Lead[], count: number }>("/leads", { params });
		return response.data.data || [];
	} catch (error) {
		console.error("Error fetching all leads:", error);
		return [];
	}
}

export async function getSavedLeads(): Promise<Lead[]> {
	try {
		const response = await api.get<{ data: Lead[], count: number }>("/leads");
		return response.data.data || [];
	} catch (error) {
		console.error("Error fetching saved leads:", error);
		return [];
	}
}

export async function getSavedLeadIds(): Promise<string[]> {
	try {
		const response = await api.get<{ data: Lead[], count: number }>("/leads");
		const leads = response.data.data || [];
		return leads
			.map((l) => l.id)
			.filter((id): id is string => Boolean(id) && id !== "000000000000000000000000");
	} catch (error) {
		console.error("Error fetching saved lead IDs:", error);
		return [];
	}
}

export async function exportLeads(): Promise<void> {
	try {
		const response = await api.get("/export", {
			responseType: "blob",
		});

		// Create a URL object for the blob
		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `leads-${new Date().toISOString().split('T')[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	} catch (error) {
		console.error("Error exporting leads:", error);
		throw error;
	}
}

export async function deleteLead(id: string): Promise<void> {
	try {
		await api.delete(`/leads?id=${id}`);
	} catch (error) {
		console.error("Error deleting lead:", error);
		throw error;
	}
}

export async function clearAllLeads(): Promise<void> {
	try {
		await api.delete("/leads");
	} catch (error) {
		console.error("Error clearing all leads:", error);
		throw error;
	}
}

export async function saveLeads(leads: Lead[]): Promise<{ success: boolean; message: string; count: number }> {
	try {
		console.log("🔴 SAVE LEADS CALLED - Attempting to save", leads.length, "leads to database");
		const response = await api.post("/leads/save", { leads });
		console.log("✅ SAVE LEADS SUCCESS - Saved", response.data.count, "leads");
		return response.data;
	} catch (error) {
		console.error("❌ SAVE LEADS ERROR:", error);
		throw error;
	}
}
