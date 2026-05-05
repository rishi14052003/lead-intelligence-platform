import { useState, useEffect } from "react";
import { Bookmark, Mail, Link, Trash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLeadStore } from "../store/leadStore";
import ExportDropdown from "../components/ExportDropdown";
import Dialog from "../components/Dialog";
import { exportToExcel, exportToPDF, exportToWord } from "../utils/exportUtils";
import { deleteLead } from "../services/leadService";

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
          {IconComp && <IconComp size={20} />}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: IconComp = Bookmark, title, subtitle }: { icon?: any; title: string; subtitle: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{IconComp && <IconComp size={20} />}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{subtitle}</div>
    </div>
  );
}


export default function SavedLeads() {
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "primary" | "default";
  } | null>(null);
  const { leads, loading, fetchSavedLeads, clearAllSavedLeads } = useLeadStore();

  // Calculate pagination
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = leads.slice(startIndex, endIndex);

  useEffect(() => {
    fetchSavedLeads();
  }, [fetchSavedLeads]);

  // Reset to page 1 when leads change
  useEffect(() => {
    setCurrentPage(1);
  }, [leads.length]);

  const toggleLeadSelection = (index: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLeads(newSelected);
  };

  const handleClearAll = () => {
    setDialogConfig({
      title: "Clear All Saved Leads",
      message: "Are you sure you want to clear all saved leads? This action cannot be undone.",
      onConfirm: async () => {
        await clearAllSavedLeads();
        setDialogOpen(false);
      },
      variant: "danger",
    });
    setDialogOpen(true);
  };

  const handleDeleteLead = (leadId: string, leadName: string) => {
    setDialogConfig({
      title: "Remove Saved Lead",
      message: `Are you sure you want to remove ${leadName} from your saved leads?`,
      onConfirm: async () => {
        try {
          await deleteLead(leadId);
          await fetchSavedLeads();
          setDialogOpen(false);
        } catch (error) {
          console.error("Error deleting lead:", error);
        }
      },
      variant: "danger",
    });
    setDialogOpen(true);
  };

  const handleUnsaveLead = (leadId: string, leadName: string) => {
    setDialogConfig({
      title: "Unsave Lead",
      message: `Are you sure you want to unsave ${leadName}?`,
      onConfirm: async () => {
        try {
          await deleteLead(leadId);
          await fetchSavedLeads();
          setDialogOpen(false);
        } catch (error) {
          console.error("Error unsaving lead:", error);
        }
      },
      variant: "danger",
    });
    setDialogOpen(true);
  };

  const handleExport = (format: 'pdf' | 'excel' | 'word') => {
    const exportFilename = `saved-leads-${new Date().toISOString().split('T')[0]}`;
    
    switch (format) {
      case 'excel':
        exportToExcel(leads, exportFilename);
        break;
      case 'pdf':
        exportToPDF(leads, exportFilename);
        break;
      case 'word':
        exportToWord(leads, exportFilename);
        break;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">Saved Leads</div>
        <div className="page-subtitle">Manage your saved leads and contacts</div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stats-3" style={{ marginBottom: 20 }}>
        <StatCard label="Total Saved" value={leads.length.toString()} icon={Bookmark} iconVariant="violet" />
        <StatCard label="With Emails" value={leads.filter(l => l.email).length.toString()} icon={Mail} iconVariant="violet" />
        <StatCard label="LinkedIn" value={leads.filter(l => l.linkedin).length.toString()} icon={Link} iconVariant="violet" />
      </div>

      <div className="card" style={{ height: "600px" }}>
        <div className="card-header">
          <span className="card-title">Your Saved Leads · <span style={{ color: "var(--text2)", fontWeight: 400, fontSize: 16 }}>{leads.length} saved</span></span>
          <div style={{ display: "flex", gap: 8 }}>
            <ExportDropdown onExport={handleExport} disabled={loading || leads.length === 0} />
            <button className="btn btn-danger btn-sm" onClick={handleClearAll} disabled={loading || leads.length === 0}><Trash size={18} /> Clear All</button>
          </div>
        </div>
        {leads.length > 0 ? (
          <>
            <div className="table-wrap" style={{ tableLayout: "fixed" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "25%" }}>Name</th>
                    <th style={{ width: "15%" }}>Role</th>
                    <th style={{ width: "25%" }}>Email</th>
                    <th style={{ width: "20%" }}>LinkedIn</th>
                    <th style={{ width: "15%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeads.map((lead, i) => (
                    <tr key={i} onClick={() => toggleLeadSelection(i)} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="lead-name">{sanitizeName(lead.name)}</div>
                        <div className="lead-role">{lead.company}</div>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button 
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnsaveLead(lead.id || "", sanitizeName(lead.name));
                            }}
                            style={{ color: "var(--accent)" }}
                          >
                            <Bookmark size={18} fill="currentColor" />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLead(lead.id || "", sanitizeName(lead.name));
                            }}
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Showing {startIndex + 1}-{Math.min(endIndex, leads.length)} of {leads.length} leads</span>
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
            <EmptyState 
              icon={Bookmark} 
              title="No saved leads" 
              subtitle="Save interesting leads while searching to build your database." 
            />
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
