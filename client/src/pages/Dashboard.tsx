import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Users, Bookmark, Search, TrendingUp, Clock, Grid, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

function Card({ title, extra, children, style }: { title?: string; extra?: any; children: any; style?: any }) {
  return (
    <div className="card" style={style}>
      {(title || extra) && (
        <div className="card-header">
          <span className="card-title">{title}</span>
          {extra}
        </div>
      )}
      <div className="card-body">{children}</div>
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());

  const toggleActionSelection = (index: number) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedActions(newSelected);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Monitor your lead generation performance</div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stats-4">
        <StatCard label="Total Leads" value="0" icon={Users} iconVariant="violet" />
        <StatCard label="Saved Leads" value="0" icon={Bookmark} variant="green" iconVariant="emerald" />
        <StatCard label="Searches" value="0" icon={Search} variant="blue" iconVariant="sky" />
        <StatCard label="Conversion" value="0%" icon={TrendingUp} variant="purple" iconVariant="lilac" />
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header"><span className="card-title">Quick Actions</span></div>
        <div className="card-body">
          <div className="quick-actions">
            <div className="quick-action" onClick={() => { navigate("search"); toggleActionSelection(0); }} style={{ cursor: "pointer" }}>
              <div className="qa-icon" style={{ background: "rgba(108,99,255,0.2)", color: "var(--accent2)" }}>
                <Search size={16} />
              </div>
              <div className="qa-title">New Search</div>
              <div className="qa-sub">Find leads for a company</div>
              {selectedActions.has(0) && (
                <div style={{ 
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  backgroundColor: "#3b82f6"
                }} />
              )}
            </div>
            <div className="quick-action" onClick={() => { navigate("saved"); toggleActionSelection(1); }} style={{ cursor: "pointer" }}>
              <div className="qa-icon" style={{ background: "rgba(16,185,129,0.2)", color: "var(--green)" }}>
                <Bookmark size={16} />
              </div>
              <div className="qa-title">View Saved</div>
              <div className="qa-sub">Manage your saved leads</div>
              {selectedActions.has(1) && (
                <div style={{ 
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  backgroundColor: "#3b82f6"
                }} />
              )}
            </div>
            <div className="quick-action" onClick={() => { navigate("history"); toggleActionSelection(2); }} style={{ cursor: "pointer" }}>
              <div className="qa-icon" style={{ background: "rgba(167,139,250,0.2)", color: "var(--accent2)" }}>
                <Clock size={16} />
              </div>
              <div className="qa-title">View History</div>
              <div className="qa-sub">Check past searches</div>
              {selectedActions.has(2) && (
                <div style={{ 
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  backgroundColor: "#3b82f6"
                }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ display: 'flex', gap: '14px' }}>
        <div className="col-6" style={{ flex: 1 }}>
          <Card title="Recent Activity" extra={<button className="btn btn-ghost btn-sm">View All</button>} style={{ height: '100%' }}>
            <EmptyState icon={Clock} title="No recent activity" subtitle="Your recent searches and lead activities will appear here." />
          </Card>
        </div>
        <div className="col-6" style={{ flex: 1 }}>
          <Card title="Top Companies" extra={<button className="btn btn-ghost btn-sm">View All</button>} style={{ height: '100%' }}>
            <EmptyState icon={Grid} title="No data yet" subtitle="Companies with most leads will appear here." />
          </Card>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Performance Overview</span>
          <div className="filter-pills">
            <button className="filter-pill active">Week</button>
            <button className="filter-pill">Month</button>
            <button className="filter-pill">Year</button>
          </div>
        </div>
        <div className="card-body">
          <div className="chart-placeholder">
            <BarChart3 size={24} />
            <span>Start searching for leads to see performance metrics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
