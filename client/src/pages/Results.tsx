import { useState } from "react";
import { Search, Users, Mail, Link, Bookmark, Download, Filter } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLeadStore } from "../store/leadStore";

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

export default function Results() {
  const [filter, setFilter] = useState("All");
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const leads = useLeadStore((s) => s.leads);
  const loading = useLeadStore((s) => s.loading);
  
  const roles = ["All", "CEO", "CTO", "VP of Sales", "Head of HR", "Engineering Manager"];
  const filtered = filter === "All" ? leads : leads.filter(l => l.role === filter);

  const toggleLeadSelection = (index: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLeads(newSelected);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="page-title">Search Results</div>
          <div className="page-subtitle">
            {loading ? "Searching..." : `${filtered.length} lead${filtered.length !== 1 ? "s" : ""} found · tesla.com`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={12} /> Export</button>
          <button className="btn btn-primary btn-sm"><Bookmark size={12} /> Save All</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stats-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total Leads" value={leads.length.toString()} icon={Users} iconVariant="violet" />
        <StatCard label="With Emails" value={leads.filter(l => l.email).length.toString()} icon={Mail} iconVariant="violet" />
        <StatCard label="With LinkedIn" value={leads.filter(l => l.linkedin).length.toString()} icon={Link} iconVariant="violet" />
        <StatCard label="High Score" value={leads.filter(l => l.score && l.score >= 80).length.toString()} icon={Search} iconVariant="violet" />
      </div>

      <div className="card" style={{ marginBottom: 14, height: "600px" }}>
        <div className="card-header">
          <span className="card-title">Lead Results</span>
          <div className="filter-pills">
            <Filter size={12} />
            {roles.map(r => (
              <button key={r} className={`filter-pill ${filter === r ? "active" : ""}`} onClick={() => setFilter(r)}>{r}</button>
            ))}
          </div>
        </div>
        {filtered.length > 0 ? (
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
                  {filtered.map((lead, i) => (
                    <tr key={i} onClick={() => toggleLeadSelection(i)} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="lead-name">{lead.name}</div>
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
                          <button className="btn btn-ghost btn-sm btn-icon"><Bookmark size={12} /></button>
                          <button className="btn btn-ghost btn-sm btn-icon"><Download size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Showing {filtered.length} of {filtered.length} results</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-secondary btn-sm" disabled>Prev</button>
                <button className="btn btn-secondary btn-sm" disabled>Next</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
            <EmptyState title="No leads match this filter" subtitle="Try a different role filter." />
          </div>
        )}
      </div>
    </div>
  );
}
