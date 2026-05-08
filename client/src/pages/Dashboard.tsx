import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Users, Bookmark, Search, TrendingUp, Clock, Grid, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useHistoryStore } from "../store/historyStore";
import ExportDropdown from "../components/ExportDropdown";
import { exportToExcel, exportToPDF, exportToWord } from "../utils/exportUtils";

function StatCard({ 
  label, 
  value, 
  icon: IconComp, 
  variant = "", 
  iconVariant = "violet", 
  meta = "",
  onClick,
  style,
  valueClassName = "",
  labelClassName = "",
  iconSize = 20
}: { 
  label: string; 
  value: string; 
  icon?: LucideIcon; 
  variant?: string; 
  iconVariant?: string; 
  meta?: string; 
  onClick?: () => void;
  style?: React.CSSProperties;
  valueClassName?: string;
  labelClassName?: string;
  iconSize?: number;
}) {
  return (
    <div className={`stat-card ${variant}`} onClick={onClick} style={style}>
      <div className="stat-top">
        <div>
          <div className={labelClassName || "stat-label"}>{label}</div>
          <div className={valueClassName || `stat-value ${variant}-text`} style={{ marginTop: 6 }}>{value}</div>
          {meta && <div className="stat-meta">{meta}</div>}
        </div>
        <div className={`stat-icon ${iconVariant}`}>
          {IconComp && <IconComp size={iconSize} />}
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
  subtitle,
  iconSize = 20
}: { 
  icon?: LucideIcon; 
  title: string; 
  subtitle: string; 
  iconSize?: number;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{IconComp && <IconComp size={iconSize} />}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{subtitle}</div>
    </div>
  );
}

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const sunday = new Date(now.setDate(diff + 6));
  return { start: monday, end: sunday };
}

function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end };
}

function getYearRange() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start, end };
}

function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [performancePeriod, setPerformancePeriod] = useState<'week' | 'month' | 'year'>('week');
  const [historyPage, setHistoryPage] = useState(1);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const { history, loadFromLocalStorage } = useHistoryStore();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  const getDateRange = () => {
    if (performancePeriod === 'week') return getWeekRange();
    if (performancePeriod === 'month') return getMonthRange();
    return getYearRange();
  };

  const historyItemsPerPage = 5;
  const totalHistoryPages = showAllHistory ? Math.ceil(history.length / historyItemsPerPage) : 1;
  const historyStartIndex = (historyPage - 1) * historyItemsPerPage;
  const historyEndIndex = historyStartIndex + historyItemsPerPage;
  const displayHistory = showAllHistory
    ? history.slice(historyStartIndex, historyEndIndex)
    : history.slice(0, historyItemsPerPage);

  const topCompanies = history
    .reduce((acc: { company: string; leads: number }[], h) => {
      const existing = acc.find((c) => c.company === h.domain);
      if (existing) {
        existing.leads += h.leadsFound;
      } else {
        acc.push({ company: h.domain, leads: h.leadsFound });
      }
      return acc;
    }, [])
    .sort((a, b) => b.leads - a.leads);

  const companiesPerPage = 5;
  const totalCompanyPages = showAllCompanies ? Math.ceil(topCompanies.length / companiesPerPage) : 1;
  const companyStartIndex = (companiesPage - 1) * companiesPerPage;
  const companyEndIndex = companyStartIndex + companiesPerPage;
  const displayCompanies = showAllCompanies
    ? topCompanies.slice(companyStartIndex, companyEndIndex)
    : topCompanies.slice(0, companiesPerPage);

  useEffect(() => {
    setHistoryPage(1);
    setCompaniesPage(1);
  }, [history.length]);

  const rowSurfaceStyle: React.CSSProperties = {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
  };

  const handleExportRecentActivity = (format: 'pdf' | 'excel' | 'word') => {
    const exportFilename = `recent-activity-${new Date().toISOString().split('T')[0]}`;
    const exportData = history.map((h) => ({
      domain: h.domain || '-',
      date: h.date || '-',
      leadsFound: h.leadsFound || 0,
    }));

    switch (format) {
      case 'excel':
        exportToExcel(exportData, exportFilename, 'Recent Activity');
        break;
      case 'pdf':
        exportToPDF(exportData, exportFilename, 'Recent Activity Export');
        break;
      case 'word':
        exportToWord(exportData, exportFilename, 'Recent Activity Export');
        break;
    }
  };

  const handleExportTopCompanies = (format: 'pdf' | 'excel' | 'word') => {
    const exportFilename = `top-companies-${new Date().toISOString().split('T')[0]}`;
    const exportData = topCompanies.map((c, index) => ({
      rank: index + 1,
      company: c.company || '-',
      totalLeads: c.leads || 0,
    }));

    switch (format) {
      case 'excel':
        exportToExcel(exportData, exportFilename, 'Top Companies');
        break;
      case 'pdf':
        exportToPDF(exportData, exportFilename, 'Top Companies Export');
        break;
      case 'word':
        exportToWord(exportData, exportFilename, 'Top Companies Export');
        break;
    }
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
        <StatCard label="Saved Leads" value="0" icon={Bookmark} iconVariant="violet" />
        <StatCard label="Searches" value="0" icon={Search} iconVariant="violet" />
        <StatCard label="Conversion" value="0%" icon={TrendingUp} iconVariant="violet" />
      </div>

      {/* Quick Actions */}
      <div className="stats-grid stats-3" style={{ marginBottom: 14 }}>
        <StatCard 
          label="New Search" 
          value="Start" 
          icon={Search} 
          iconVariant="violet"
          labelClassName="stat-action-label"
          valueClassName="stat-action-value"
          iconSize={19}
          onClick={() => { navigate("/search"); }}
          style={{ cursor: "pointer" }}
        />
        <StatCard 
          label="View Saved" 
          value="Manage" 
          icon={Bookmark} 
          iconVariant="violet"
          labelClassName="stat-action-label"
          valueClassName="stat-action-value"
          iconSize={19}
          onClick={() => { navigate("/saved"); }}
          style={{ cursor: "pointer" }}
        />
        <StatCard 
          label="Recent Activity" 
          value="View All" 
          icon={Clock} 
          iconVariant="violet"
          labelClassName="stat-action-label"
          valueClassName="stat-action-value"
          iconSize={19}
          onClick={() => { setShowAllHistory(true); setHistoryPage(1); }}
          style={{ cursor: "pointer" }}
        />
      </div>

      <div className="row" style={{ display: 'flex', gap: '14px' }}>
        {/* Recent Activity */}
        <div className="col-6" style={{ flex: 1 }}>
          <Card
            title={`Recent Activity · ${history.length} searches`}
            extra={
              <div style={{ display: "flex", gap: 8 }}>
                <ExportDropdown onExport={handleExportRecentActivity} disabled={history.length === 0} />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (showAllHistory) {
                      setShowAllHistory(false);
                      setHistoryPage(1);
                    } else {
                      setShowAllHistory(true);
                      setHistoryPage(1);
                    }
                  }}
                  disabled={history.length <= historyItemsPerPage}
                >
                  {showAllHistory ? "Show Less" : "View All"}
                </button>
              </div>
            }
            style={{ height: '100%' }}
          >
            {displayHistory.length === 0 ? (
              <EmptyState icon={Clock} title="No recent activity" subtitle="Your recent searches and lead activities will appear here." iconSize={24} />
            ) : (
              <div style={{ minHeight: "300px", display: "flex", flexDirection: "column" }}>
                {displayHistory.map((h, i) => (
                  <div
                    key={h.id}
                    onClick={() => navigate("/results")}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "13px 15px",
                      marginBottom: "10px",
                      borderRadius: "12px",
                      ...rowSurfaceStyle,
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface3)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    }}
                  >
                    {/* Left: Icon + Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: "18px",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--text1)",
                        flexShrink: 0,
                      }}>
                        {historyStartIndex + i + 1}
                      </div>
                      <div style={{
                        width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                        background: "linear-gradient(135deg, rgba(108,99,255,0.25), rgba(108,99,255,0.1))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Search size={17} style={{ color: "var(--accent)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "14px", fontWeight: "600", color: "var(--text1)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "3px"
                        }}>
                          {h.domain}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text2)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={11} style={{ opacity: 0.75 }} />
                          <span>{h.date}</span>
                          <span style={{ opacity: 0.6 }}>·</span>
                          <span style={{ color: "var(--text1)", fontWeight: "600" }}>{h.leadsFound} leads</span>
                        </div>
                      </div>
                    </div>
                    {/* Right: Badge */}
                    <div style={{
                      minWidth: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: "700", fontSize: "14px", color: "#fff",
                      boxShadow: "0 3px 10px rgba(108,99,255,0.35)",
                    }}>
                      {h.leadsFound}
                    </div>
                  </div>
                ))}
                {showAllHistory && totalHistoryPages > 1 && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 12 }}>
                    <span style={{ fontSize: 12, color: "#888" }}>
                      Showing {historyStartIndex + 1}-{Math.min(historyEndIndex, history.length)} of {history.length} searches
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                      >
                        Prev
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                        disabled={historyPage === totalHistoryPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Top Companies */}
        <div className="col-6" style={{ flex: 1 }}>
          <Card
            title={`Top Companies · ${topCompanies.length} companies`}
            extra={
              <div style={{ display: "flex", gap: 8 }}>
                <ExportDropdown onExport={handleExportTopCompanies} disabled={topCompanies.length === 0} />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (showAllCompanies) {
                      setShowAllCompanies(false);
                      setCompaniesPage(1);
                    } else {
                      setShowAllCompanies(true);
                      setCompaniesPage(1);
                    }
                  }}
                  disabled={topCompanies.length <= companiesPerPage}
                >
                  {showAllCompanies ? "Show Less" : "View All"}
                </button>
              </div>
            }
            style={{ height: '100%' }}
          >
            {displayCompanies.length === 0 ? (
              <EmptyState icon={Grid} title="No data yet" subtitle="Companies with most leads will appear here." iconSize={24} />
            ) : (
              <div style={{ minHeight: "300px", display: "flex", flexDirection: "column" }}>
                {displayCompanies.map((company, i) => (
                  <div
                    key={`${company.company}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "13px 15px",
                      marginBottom: "10px",
                      borderRadius: "12px",
                      ...rowSurfaceStyle,
                      transition: "background 0.18s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: "18px",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--text1)",
                        flexShrink: 0,
                      }}>
                        {companyStartIndex + i + 1}
                      </div>
                      <div style={{
                        width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                        background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(168,85,247,0.1))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Bookmark size={17} style={{ color: "var(--accent2)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "14px", fontWeight: "600", color: "var(--text1)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px"
                        }}>
                          {company.company}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text2)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <TrendingUp size={11} style={{ opacity: 0.75 }} />
                          <span style={{ color: "var(--text1)", fontWeight: "600" }}>{company.leads} leads total</span>
                        </div>
                      </div>
                    </div>
                    <div style={{
                      minWidth: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
                      background: "linear-gradient(135deg, var(--accent2), var(--accent))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: "700", fontSize: "14px", color: "#fff",
                      boxShadow: "0 3px 10px rgba(168,85,247,0.3)",
                    }}>
                      {company.leads}
                    </div>
                  </div>
                ))}
                {showAllCompanies && totalCompanyPages > 1 && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 12 }}>
                    <span style={{ fontSize: 12, color: "#888" }}>
                      Showing {companyStartIndex + 1}-{Math.min(companyEndIndex, topCompanies.length)} of {topCompanies.length} companies
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCompaniesPage((p) => Math.max(1, p - 1))}
                        disabled={companiesPage === 1}
                      >
                        Prev
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCompaniesPage((p) => Math.min(totalCompanyPages, p + 1))}
                        disabled={companiesPage === totalCompanyPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Performance Overview</span>
          <div className="filter-pills">
            <button 
              className={`filter-pill ${performancePeriod === 'week' ? 'active' : ''}`}
              onClick={() => setPerformancePeriod('week')}
            >
              Week
            </button>
            <button 
              className={`filter-pill ${performancePeriod === 'month' ? 'active' : ''}`}
              onClick={() => setPerformancePeriod('month')}
            >
              Month
            </button>
            <button 
              className={`filter-pill ${performancePeriod === 'year' ? 'active' : ''}`}
              onClick={() => setPerformancePeriod('year')}
            >
              Year
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="chart-placeholder">
            <BarChart3 size={28} />
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                {formatDateRange(getDateRange().start, getDateRange().end)}
              </div>
              <span>Start searching for leads to see performance metrics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}