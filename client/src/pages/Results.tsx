import { useState, useEffect } from "react";
import { Search, Users, Mail, Link, Bookmark, Filter, Globe, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLeadStore } from "../store/leadStore";
import { useHistoryStore } from "../store/historyStore";
import { saveLeads } from "../services/leadService";
import { deleteLead } from "../services/leadService";
import { getSavedLeads } from "../services/leadService";
import Dialog from "../components/Dialog";
import ExportDropdown from "../components/ExportDropdown";
import SearchProgress from "../components/feedback/SearchProgress";
import { exportToExcel, exportToPDF, exportToWord } from "../utils/exportUtils";

// Sanitize name to remove code/function-like strings
function sanitizeName(name: string): string {
  if (!name) return "Unknown";
  // Check if name looks like code (contains function, parentheses, etc.)
  if (name.includes("function") || name.includes("=>") || name.includes("return") || name.length > 100) {
    return "Unknown";
  }
  return name;
}

function StatCard({ 
  label, 
  value, 
  icon: IconComp, 
  variant = "", 
  iconVariant = "violet", 
  meta = "" 
}: { 
  label: string; 
  value: string; 
  icon?: LucideIcon; 
  variant?: string; 
  iconVariant?: string; 
  meta?: string; 
}) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-top">
        <div>
          <div className="stat-label">{label}</div>
          <div className={`stat-value ${variant}-text`} style={{ marginTop: 6 }}>{value}</div>
          {meta && <div className="stat-meta">{meta}</div>}
        </div>
        <div className={`stat-icon ${iconVariant}`}>
          {IconComp && <IconComp size={16} />}
        </div>
      </div>
    </div>
  );
}


function EmptyState({ 
  icon: IconComp = Search, 
  title, 
  subtitle 
}: { 
  icon?: LucideIcon; 
  title: string; 
  subtitle: string; 
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{IconComp && <IconComp size={20} />}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{subtitle}</div>
    </div>
  );
}


export default function Results() {
  const [filter, setFilter] = useState("All");
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedLeadSignatures, setSavedLeadSignatures] = useState<Set<string>>(new Set());
  const [savedLeadIdMap, setSavedLeadIdMap] = useState<Map<string, string>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "primary" | "default";
  } | null>(null);
  const leads = useLeadStore((s) => s.leads);
  const loading = useLeadStore((s) => s.loading);
  const clearLeads = useLeadStore((s) => s.clearLeads);
  const restoreSearchResults = useLeadStore((s) => s.restoreSearchResults);
  const { history } = useHistoryStore();

  // Debug: Log leads data changes
  useEffect(() => {
    console.log("🔍 Leads data updated:", {
      leadsCount: leads.length,
      loading,
      leads: leads.slice(0, 3), // Show first 3 leads for debugging
    });
  }, [leads, loading]);
  
  // Only restore search results on initial mount if no leads are present
  useEffect(() => {
    console.log("📋 Initial mount - checking if leads need to be restored");
    console.log("📋 Current leads count:", leads.length);
    console.log("📋 History length:", history.length);
    
    if (leads.length === 0 && history.length > 0) {
      console.log("📋 No leads found but history exists, restoring from localStorage");
      restoreSearchResults();
    } else if (leads.length === 0 && history.length === 0) {
      console.log("📋 No leads and no history, keeping empty");
    } else {
      console.log("📋 Leads already present, not restoring");
    }
  }, []); // Only run on mount
  
  // Load saved lead signatures on mount to check which are already saved
  useEffect(() => {
    refreshSavedSignatures();
  }, []);

  // Refresh saved lead signatures after save/unsave
  const refreshSavedSignatures = async () => {
    try {
      const savedLeads = await getSavedLeads();
      const signatures = new Set<string>();
      const idMap = new Map<string, string>();
      savedLeads.forEach((l) => {
        const sig = getLeadSignature(l);
        signatures.add(sig);
        if (l.id) idMap.set(sig, l.id);
      });
      setSavedLeadSignatures(signatures);
      setSavedLeadIdMap(idMap);
    } catch (error) {
      console.error("Error refreshing saved signatures:", error);
    }
  };

  // Reset to page 1 when filter or leads change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, leads.length]);
  
  const roles = ["All", "CEO", "CTO", "Founder", "HR Head", "Head of Sales", "Vice President"];
  
  // Role-based prioritization function
  const getRolePriority = (role: string): number => {
    if (!role) return 999;
    const normalizedRole = role.toLowerCase().trim();
    
    // Priority 1: CEO
    if (normalizedRole.includes('ceo') || normalizedRole === 'chief executive officer') {
      return 1;
    }
    
    // Priority 2: CTO
    if (normalizedRole.includes('cto') || normalizedRole === 'chief technology officer') {
      return 2;
    }
    
    // Priority 3: Other C-level executives
    if (normalizedRole.includes('chief') || normalizedRole.includes('c-level')) {
      return 3;
    }
    
    // Priority 4: Founder
    if (normalizedRole.includes('founder')) {
      return 4;
    }
    
    // Priority 5: President/VP
    if (normalizedRole.includes('president') || normalizedRole.includes('vice president')) {
      return 5;
    }
    
    // Priority 6: Head/Director
    if (normalizedRole.includes('head') || normalizedRole.includes('director')) {
      return 6;
    }
    
    // Priority 7: Manager
    if (normalizedRole.includes('manager')) {
      return 7;
    }
    
    // Default priority for all other roles
    return 8;
  };
  
  // Apply role filter and then sort by priority
  const filtered = filter === "All" 
    ? leads.slice().sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role))
    : leads.filter(l => l.role === filter).sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role));

  const getLeadSignature = (lead: any): string => {
    return [
      (lead.name || "").toLowerCase().trim(),
      (lead.role || "").toLowerCase().trim(),
      (lead.company || "").toLowerCase().trim(),
      (lead.companyUrl || "").toLowerCase().trim(),
      (lead.email || "").toLowerCase().trim(),
    ].join("|");
  };

  const isLeadSaved = (lead: any) => {
    return savedLeadSignatures.has(getLeadSignature(lead));
  };

  const getSavedLeadDbId = (lead: any): string | null => {
    return savedLeadIdMap.get(getLeadSignature(lead)) || null;
  };

  // Calculate pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = filtered.slice(startIndex, endIndex);

  const toggleLeadSelection = (index: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLeads(newSelected);
  };

  const handleSaveAll = async () => {
    if (filtered.length === 0) return;
    setSaving(true);
    try {
      await saveLeads(filtered);
      // Refresh saved lead signatures to update bookmark icons
      await refreshSavedSignatures();
      // No dialog shown for save - just save silently
    } catch (error) {
      setDialogConfig({
        title: "Error",
        message: "Failed to save leads",
        onConfirm: () => setDialogOpen(false),
        variant: "danger",
      });
      setDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingle = async (lead: any) => {
    // Check if lead is already saved
    const isSaved = isLeadSaved(lead);
    const dbId = getSavedLeadDbId(lead);

    if (isSaved) {
      // Delete the saved lead
      setDialogConfig({
        title: "Delete Saved Lead",
        message: `Are you sure you want to delete this saved lead?`,
        onConfirm: async () => {
          try {
            if (!dbId) {
              throw new Error("Missing lead id for delete");
            }
            await deleteLead(dbId);
            await refreshSavedSignatures();
            setDialogOpen(false);
          } catch (error) {
            setDialogConfig({
              title: "Error",
              message: "Failed to delete saved lead",
              onConfirm: () => setDialogOpen(false),
              variant: "danger",
            });
            setDialogOpen(true);
          }
        },
        variant: "danger",
      });
      setDialogOpen(true);
    } else {
      // Save the lead
      try {
        await saveLeads([lead]);
        await refreshSavedSignatures();
      } catch (error) {
        setDialogConfig({
          title: "Error",
          message: "Failed to save lead",
          onConfirm: () => setDialogOpen(false),
          variant: "danger",
        });
        setDialogOpen(true);
      }
    }
  };

  const handleClear = () => {
    setDialogConfig({
      title: "Clear Results",
      message: "Are you sure you want to clear all search results?",
      onConfirm: () => {
        clearLeads();
        setDialogOpen(false);
      },
      variant: "danger",
    });
    setDialogOpen(true);
  };

  const handleExport = (format: 'pdf' | 'excel' | 'word') => {
    const exportFilename = `search-results-${new Date().toISOString().split('T')[0]}`;
    
    switch (format) {
      case 'excel':
        exportToExcel(filtered, exportFilename);
        break;
      case 'pdf':
        exportToPDF(filtered, exportFilename);
        break;
      case 'word':
        exportToWord(filtered, exportFilename);
        break;
    }
  };

  return (
    <div>
      {/* Loading Progress */}
      {loading && <SearchProgress />}

      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="page-title">Search Results</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleClear}
            disabled={leads.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minHeight: "36px" }}
          >
            <Trash2 size={14} /> Clear
          </button>
          <ExportDropdown onExport={handleExport} disabled={loading || filtered.length === 0} />
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleSaveAll}
            disabled={saving || filtered.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minHeight: "36px" }}
          >
            <Bookmark size={14} /> {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stats-3" style={{ marginBottom: 20 }}>
        <StatCard label="Total Leads" value={leads.length.toString()} icon={Users} iconVariant="violet" />
        <StatCard label="With Emails" value={leads.filter(l => l.email).length.toString()} icon={Mail} iconVariant="violet" />
        <StatCard label="With LinkedIn" value={leads.filter(l => l.linkedin).length.toString()} icon={Link} iconVariant="violet" />
      </div>

      <div className="card" style={{ marginBottom: 14, display: "flex", flexDirection: "column" }}>
        <div className="card-header">
          <span className="card-title">Lead Results</span>
          <div className="filter-pills">
            <Filter size={16} />
            {roles.map(r => (
              <button key={r} className={`filter-pill ${filter === r ? "active" : ""}`} onClick={() => setFilter(r)}>{r}</button>
            ))}
          </div>
        </div>
        {filtered.length > 0 ? (
          <>
            <div className="table-wrap" style={{ tableLayout: "fixed", flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Name</th>
                    <th style={{ width: "15%" }}>Role</th>
                    <th style={{ width: "20%" }}>Email</th>
                    <th style={{ width: "15%" }}>LinkedIn</th>
                    <th style={{ width: "20%" }}>Company URL</th>
                    <th style={{ width: "10%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeads.map((lead, i) => (
                    <tr key={i} onClick={() => toggleLeadSelection(i)} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="lead-name">{sanitizeName(lead.name)}</div>
                      </td>
                      <td><span className="badge badge-purple">{lead.role}</span></td>
                      <td>
                        {lead.email
                          ? <a href={`mailto:${lead.email}`} className="email-link">{lead.email}</a>
                          : <span className="muted">-</span>}
                      </td>
                      <td>
                        {lead.linkedin
                          ? <a href={lead.linkedin} className="linkedin-link" target="_blank" rel="noopener noreferrer" title={lead.linkedin}>
                              <Link size={12} /> {lead.linkedin}
                            </a>
                          : <span className="muted">-</span>}
                      </td>
                      <td>
                        {lead.companyUrl
                          ? <a href={lead.companyUrl} className="company-link" target="_blank" rel="noopener noreferrer">
                              <Globe size={12} /> {lead.companyUrl}
                            </a>
                          : <span className="muted">-</span>}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button 
                            className="btn btn-ghost btn-sm btn-icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveSingle(lead);
                            }}
                            style={{ 
                              color: isLeadSaved(lead) ? "var(--accent)" : "var(--text2)",
                              opacity: isLeadSaved(lead) ? 1 : 0.6
                            }}
                            title={isLeadSaved(lead) ? "Click to unsave" : "Click to save"}
                          >
                            <Bookmark 
                              size={20} 
                              fill={isLeadSaved(lead) ? "currentColor" : "none"} 
                              strokeWidth={isLeadSaved(lead) ? 0 : 2}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} results</span>
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
            <EmptyState title="No leads match this filter" subtitle="Try a different role filter." />
          </div>
        )}
      </div>
      
      {dialogOpen && dialogConfig && (
        <Dialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title={dialogConfig.title}
          message={dialogConfig.message}
          onConfirm={dialogConfig.onConfirm}
          variant={dialogConfig.variant}
        />
      )}
    </div>
  );
}
