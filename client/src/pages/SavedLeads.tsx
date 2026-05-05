import { useState, useEffect } from "react";
import { Bookmark, Mail, Link, Star, Trash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLeadStore } from "../store/leadStore";
import ExportDropdown from "../components/ExportDropdown";
import { exportToExcel, exportToPDF, exportToWord } from "../utils/exportUtils";

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

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? "badge-green" : score >= 60 ? "badge-yellow" : "badge-red";
  const fillColor = score >= 80 ? "var(--green)" : score >= 60 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="score-wrap">
      <span className={`badge ${cls}`}>{score}</span>
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: fillColor }} />
      </div>
    </div>
  );
}

export default function SavedLeads() {
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const { leads, loading, fetchSavedLeads, clearAllSavedLeads } = useLeadStore();

  useEffect(() => {
    fetchSavedLeads();
  }, [fetchSavedLeads]);

  const toggleLeadSelection = (index: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLeads(newSelected);
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all saved leads?")) {
      await clearAllSavedLeads();
    }
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
      <div className="stats-grid stats-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total Saved" value={leads.length.toString()} icon={Bookmark} iconVariant="violet" />
        <StatCard label="With Emails" value={leads.filter(l => l.email).length.toString()} icon={Mail} iconVariant="violet" />
        <StatCard label="LinkedIn" value={leads.filter(l => l.linkedin).length.toString()} icon={Link} iconVariant="violet" />
        <StatCard label="High Score" value={leads.filter(l => l.score && l.score >= 80).length.toString()} icon={Star} iconVariant="violet" />
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
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>LinkedIn</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => (
                    <tr key={i} onClick={() => toggleLeadSelection(i)} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="lead-name">{lead.name}</div>
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
                      <td>{typeof lead.score === "number" ? <ScoreBadge score={lead.score} /> : <span className="muted">-</span>}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {selectedLeads.has(i) && (
                            <div style={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: "50%", 
                              backgroundColor: "#3b82f6",
                              flexShrink: 0
                            }} />
                          )}
                          <button className="btn btn-ghost btn-sm btn-icon"><Bookmark size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Showing {leads.length} of {leads.length} leads</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-secondary btn-sm" disabled>Prev</button>
                <button className="btn btn-secondary btn-sm" disabled>Next</button>
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
    </div>
  );
}
