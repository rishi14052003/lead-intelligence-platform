import { useLeadStore } from "../store/leadStore";

export function useLeads() {
  const {
    leads,
    loading,
    error,
    roleFilter,
    search,
    fetchSavedLeads,
    clearLeads,
    setRoleFilter
  } = useLeadStore();

  return {
    leads,
    loading,
    error,
    roleFilter,
    search,
    fetchSavedLeads,
    clearLeads,
    setRoleFilter
  };
}