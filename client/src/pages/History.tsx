import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, TrendingUp, Filter, Bookmark } from "lucide-react";
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

export default function History() {
  const navigate = useNavigate();
  const [selectedHistory, setSelectedHistory] = useState<Set<number>>(new Set());
  const history = [];

  const toggleHistorySelection = (index: number) => {
    const newSelected = new Set(selectedHistory);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedHistory(newSelected);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">Search History</div>
        <div className="page-subtitle">View and manage your previous searches</div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stats-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total Searches" value={history.length.toString()} icon={Search} variant="blue" iconVariant="sky" />
        <StatCard label="Companies Found" value="0" icon={Search} variant="green" iconVariant="emerald" />
        <StatCard label="Leads Discovered" value="0" icon={Bookmark} variant="accent" iconVariant="violet" />
        <StatCard label="Success Rate" value="0%" icon={TrendingUp} variant="orange" iconVariant="amber" />
      </div>

      {/* Main Content Grid */}
      <div className="row" style={{ gap: 14 }}>
        {/* Recent Searches */}
        <div className="col-6" style={{ flex: 2 }}>
          <div className="card" style={{ marginBottom: 14, height: "514px" }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} />
                <span className="card-title">Recent Searches</span>
              </div>
              <button className="btn btn-ghost btn-sm">
                <Filter size={12} /> Filter
              </button>
            </div>
            <div className="card-body">
              {history.length === 0 ? (
                <EmptyState 
                  icon={Clock} 
                  title="No search history" 
                  subtitle="Your previous searches will appear here once you start exploring companies." 
                />
              ) : (
                <div className="history-list">
                  {history.map((h, i) => (
                    <div key={h.id} className="history-item" onClick={() => { navigate("/results"); toggleHistorySelection(i); }} style={{ cursor: "pointer" }}>
                      <div className="history-left">
                        <div className="history-icon-wrapper">
                          <Search size={14} />
                        </div>
                        <div className="history-content">
                          <div className="history-domain">{h.domain}</div>
                          <div className="history-meta">{h.date} · {h.leadsFound} leads found</div>
                        </div>
                      </div>
                      <div className="history-right">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {selectedHistory.has(i) && (
                            <div style={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: "50%", 
                              backgroundColor: "#3b82f6",
                              flexShrink: 0
                            }} />
                          )}
                          <div className="history-badge">{h.leadsFound}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="col-6" style={{ flex: 1 }}>
          {/* Search Analytics */}
          <div className="card" style={{ marginBottom: 14, height: "250px" }}>
            <div className="card-header">
              <span className="card-title">Search Analytics</span>
            </div>
            <div className="card-body">
              <div className="analytics-grid">
                <div className="analytics-item">
                  <div className="analytics-label">Most Searched</div>
                  <div className="analytics-value">-</div>
                </div>
                <div className="analytics-item">
                  <div className="analytics-label">Avg. Response Time</div>
                  <div className="analytics-value">-</div>
                </div>
                <div className="analytics-item">
                  <div className="analytics-label">Success Rate</div>
                  <div className="analytics-value">-</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Tips */}
          <div className="card" style={{ marginBottom: 14, height: "250px" }}>
            <div className="card-header">
              <span className="card-title">Search Tips</span>
            </div>
            <div className="card-body">
              <div className="tips-list">
                <div className="tip-item">
                  <div className="tip-icon-wrapper" style={{ background: "rgba(108,99,255,0.15)", color: "var(--accent2)" }}>
                    <Search size={14} />
                  </div>
                  <div className="tip-content">
                    <div className="tip-title">Be Specific</div>
                    <div className="tip-desc">Use exact company domains</div>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-icon-wrapper" style={{ background: "rgba(16,185,129,0.15)", color: "var(--green)" }}>
                    <Bookmark size={14} />
                  </div>
                  <div className="tip-content">
                    <div className="tip-title">Save Often</div>
                    <div className="tip-desc">Build your lead database</div>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-icon-wrapper" style={{ background: "rgba(245,158,11,0.15)", color: "var(--yellow)" }}>
                    <Clock size={14} />
                  </div>
                  <div className="tip-content">
                    <div className="tip-title">Follow Up</div>
                    <div className="tip-desc">Reach out quickly</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

                  </div>
      </div>
    </div>
  );
}
