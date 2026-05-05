import { useState, useEffect } from "react";
import { Search, Users, Mail, Link, Bookmark, Download, Filter, Globe, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLeadStore } from "../store/leadStore";
import { saveLeads } from "../services/leadService";
import { deleteLead } from "../services/leadService";
import { getSavedLeadIds } from "../services/leadService";
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
  const [savedLeadIds, setSavedLeadIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
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
  
  // Load saved lead IDs on mount to check which are already saved
  useEffect(() => {
    const loadSavedIds = async () => {
      const ids = await getSavedLeadIds();
      setSavedLeadIds(new Set(ids));
    };
    loadSavedIds();
  }, []);

  // Refresh saved lead IDs after save/unsave
  const refreshSavedIds = async () => {
    const ids = await getSavedLeadIds();
    setSavedLeadIds(new Set(ids));
  };

  // Reset to page 1 when filter or leads change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, leads.length]);
  
  const roles = ["All", "CEO", "CTO", "VP of Sales", "Head of HR", "Engineering Manager"];
  const filtered = filter === "All" ? leads : leads.filter(l => l.role === filter);

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
      // Refresh saved lead IDs to update bookmark icons
      await refreshSavedIds();
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
    const isSaved = savedLeadIds.has(lead.id || lead.email || lead.name);
    
    if (isSaved) {
      // Unsave the lead
      setDialogConfig({
        title: "Unsave Lead",
        message: `Are you sure you want to unsave this lead?`,
        onConfirm: async () => {
          try {
            await deleteLead(lead.id || "");
            await refreshSavedIds();
            setDialogOpen(false);
          } catch (error) {
            setDialogConfig({
              title: "Error",
              message: "Failed to unsave lead",
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
        await refreshSavedIds();
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
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleClear}
            disabled={leads.length === 0}
          >
            <X size={12} /> Clear
          </button>
          <ExportDropdown onExport={handleExport} disabled={loading || filtered.length === 0} />
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleSaveAll}
            disabled={saving || filtered.length === 0}
          >
            <Bookmark size={12} /> {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stats-3" style={{ marginBottom: 20 }}>
        <StatCard label="Total Leads" value={leads.length.toString()} icon={Users} iconVariant="violet" />
        <StatCard label="With Emails" value={leads.filter(l => l.email).length.toString()} icon={Mail} iconVariant="violet" />
        <StatCard label="With LinkedIn" value={leads.filter(l => l.linkedin).length.toString()} icon={Link} iconVariant="violet" />
      </div>

      <div className="card" style={{ marginBottom: 14, height: "600px" }}>
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
            <div className="table-wrap" style={{ tableLayout: "fixed" }}>
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
                        <div className="lead-role">{lead.role}</div>
                      </td>
                      <td><span className="badge badge-purple">{lead.role}</span></td>
                      <td>
                        {lead.email
                          ? <a href={`mailto:${lead.email}`} className="email-link">{lead.email}</a>
                          : <span className="muted">-</span>}
                      </td>
                      <td>
                        {lead.linkedin
                          ? <a href={lead.linkedin} className="linkedin-link"><Link size={12} /> Profile</a>
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
                            style={{ color: savedLeadIds.has(lead.id || lead.email || lead.name) ? "var(--accent)" : undefined }}
                          >
                            <Bookmark size={24} fill={savedLeadIds.has(lead.id || lead.email || lead.name) ? "currentColor" : "none"} />
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon"><Download size={24} /></button>
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
