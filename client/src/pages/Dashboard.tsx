import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Users, Bookmark, Search, TrendingUp, Clock, Grid, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useHistoryStore } from "../store/historyStore";
import { useLeadStore } from "../store/leadStore";
import { saveSearchResultsToStorage, getSearchResultsFromStorage, getSearchResultsFromDatabase, getCompanySearchResultsFromDatabase } from "../services/searchResultsService";
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

function Card({ title, extra, children, style }: { title?: string; extra?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
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

type TrendBucket = {
  label: string;
  searches: number;
  leadsFound: number;
  leadsSaved: number;
  saveRate: number;
};

function parseDateSafe(value?: string): Date | null {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const isValidYMD = (year: number, month: number, day: number) => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  };

  const parts = value.split(/[/-]/).map((p) => Number(p));
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const [a, b, c] = parts;
    // Handles common dd/mm/yyyy and mm/dd/yyyy formats strictly.
    if (isValidYMD(c, b, a)) return new Date(c, b - 1, a);
    if (isValidYMD(c, a, b)) return new Date(c, a - 1, b);
  }

  return null;
}

function buildBuckets(period: 'week' | 'month' | 'year'): TrendBucket[] {
  const now = new Date();

  if (period === 'week') {
    const buckets: TrendBucket[] = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(now.getDate() - i);
      buckets.push({
        label: dayLabels[d.getDay()],
        searches: 0,
        leadsFound: 0,
        leadsSaved: 0,
        saveRate: 0,
      });
    }
    return buckets;
  }

  if (period === 'month') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekCount = Math.ceil(daysInMonth / 7);
    return Array.from({ length: weekCount }, (_, i) => ({
      label: `W${i + 1}`,
      searches: 0,
      leadsFound: 0,
      leadsSaved: 0,
      saveRate: 0,
    }));
  }

  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label) => ({
    label,
    searches: 0,
    leadsFound: 0,
    leadsSaved: 0,
    saveRate: 0,
  }));
}

function MiniTrendChart({
  title,
  subtitle,
  labels,
  seriesA,
  seriesB,
  seriesAName,
  seriesBName,
  seriesAColor = "#3b82f6",
  seriesBColor = "#f59e0b",
}: {
  title: string;
  subtitle: string;
  labels: string[];
  seriesA: number[];
  seriesB: number[];
  seriesAName: string;
  seriesBName: string;
  seriesAColor?: string;
  seriesBColor?: string;
}) {
  const width = 520;
  const height = 220;
  const pad = 24;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const safeA = seriesA.map((v) => Number.isFinite(v) ? v : 0);
  const safeB = seriesB.map((v) => Number.isFinite(v) ? v : 0);
  const maxVal = Math.max(1, ...safeA, ...safeB);

  const toPoints = (arr: number[]) => arr.map((v, i) => {
    const x = pad + (arr.length === 1 ? innerW / 2 : (i / (arr.length - 1)) * innerW);
    const y = pad + innerH - (Math.max(0, v) / maxVal) * innerH;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>{subtitle}</span>
      </div>
      <div className="card-body" style={{ paddingTop: 8 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text1)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: seriesAColor }} /> {seriesAName}
          </span>
          <span style={{ fontSize: 12, color: "var(--text1)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: seriesBColor }} /> {seriesBName}
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 220, display: "block" }}>
          <rect x={0} y={0} width={width} height={height} fill="transparent" />
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--border)" />
          <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="var(--border)" />
          <polyline fill="none" stroke={seriesAColor} strokeWidth={2.5} points={toPoints(safeA)} />
          <polyline fill="none" stroke={seriesBColor} strokeWidth={2.5} points={toPoints(safeB)} />
          {safeA.map((v, i) => {
            const x = pad + (safeA.length === 1 ? innerW / 2 : (i / (safeA.length - 1)) * innerW);
            const y = pad + innerH - (Math.max(0, v) / maxVal) * innerH;
            return <circle key={`a-${i}`} cx={x} cy={y} r={2.5} fill={seriesAColor} />;
          })}
          {safeB.map((v, i) => {
            const x = pad + (safeB.length === 1 ? innerW / 2 : (i / (safeB.length - 1)) * innerW);
            const y = pad + innerH - (Math.max(0, v) / maxVal) * innerH;
            return <circle key={`b-${i}`} cx={x} cy={y} r={2.5} fill={seriesBColor} />;
          })}
          {labels.map((lbl, i) => {
            const x = pad + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
            return (
              <text key={`l-${i}`} x={x} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--text2)">
                {lbl}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [performancePeriod, setPerformancePeriod] = useState<'week' | 'month' | 'year'>('week');
  const [historyPage, setHistoryPage] = useState(1);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [loadingCompanyData, setLoadingCompanyData] = useState<string | null>(null);
  const { history, loadFromLocalStorage, removeHistoryItem, removeHistoryByDomain } = useHistoryStore();
  const { leads: savedLeads, fetchSavedLeads, clearLeads } = useLeadStore();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    fetchSavedLeads();
    console.log("📊 Dashboard fetched saved leads:", savedLeads.length);
  }, [fetchSavedLeads, savedLeads.length]);

  // Clear search results when history becomes empty
  useEffect(() => {
    if (history.length === 0) {
      console.log("🗑️ History is empty, clearing search results");
      clearLeads();
    }
  }, [history.length, clearLeads]);

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

  const searchesCount = history.length;
  const leadsFoundCount = history.reduce((sum, item) => sum + item.leadsFound, 0);
  const leadsSavedCount = savedLeads.length;
  const saveRatePercent = leadsFoundCount > 0
    ? ((leadsSavedCount / leadsFoundCount) * 100).toFixed(1)
    : "0.0";

  const trendBuckets = (() => {
    const buckets = buildBuckets(performancePeriod);
    const now = new Date();

    history.forEach((item) => {
      const d = parseDateSafe(item.date);
      if (!d) return;
      let idx = -1;
      if (performancePeriod === "week") {
        const diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 6) idx = 6 - diff;
      } else if (performancePeriod === "month") {
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          idx = Math.floor((d.getDate() - 1) / 7);
        }
      } else if (d.getFullYear() === now.getFullYear()) {
        idx = d.getMonth();
      }

      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].searches += 1;
        buckets[idx].leadsFound += Number.isFinite(item.leadsFound) ? item.leadsFound : 0;
      }
    });

    savedLeads.forEach((lead) => {
      const d = parseDateSafe(lead.createdAt);
      if (!d) return;
      let idx = -1;
      if (performancePeriod === "week") {
        const diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 6) idx = 6 - diff;
      } else if (performancePeriod === "month") {
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          idx = Math.floor((d.getDate() - 1) / 7);
        }
      } else if (d.getFullYear() === now.getFullYear()) {
        idx = d.getMonth();
      }

      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].leadsSaved += 1;
      }
    });

    buckets.forEach((bucket) => {
      bucket.saveRate = bucket.leadsFound > 0
        ? Number(((bucket.leadsSaved / bucket.leadsFound) * 100).toFixed(1))
        : 0;
    });

    return buckets;
  })();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (historyPage !== 1) setHistoryPage(1);
    if (companiesPage !== 1) setCompaniesPage(1);
  }, [history.length, historyPage, companiesPage]);

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
        <StatCard label="Total Leads" value={String(leadsFoundCount)} icon={Users} iconVariant="violet" />
        <StatCard label="Saved Leads" value={String(leadsSavedCount)} icon={Bookmark} iconVariant="violet" />
        <StatCard label="Searches" value={String(searchesCount)} icon={Search} iconVariant="violet" />
        <StatCard label="Conversion" value={`${saveRatePercent}%`} icon={TrendingUp} iconVariant="violet" />
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
                    onClick={async () => {
                      console.log("📅 Recent Activity row clicked:", h.domain);
                      setLoadingCompanyData(h.domain);
                      
                      // Try to get from database first
                      try {
                        const dbResults = await getSearchResultsFromDatabase(h.domain);
                        if (dbResults && dbResults.leads.length > 0) {
                          console.log("✅ Retrieved results from database:", dbResults.leads.length);
                          useLeadStore.setState({
                            leads: dbResults.leads,
                            searchQuery: dbResults.query,
                            loading: false,
                            error: null,
                          });
                          saveSearchResultsToStorage(dbResults.query, dbResults.leads);
                        } else if (h.leads && h.leads.length > 0) {
                          console.log("⚠️ No database results, using history leads:", h.leads.length);
                          useLeadStore.setState({
                            leads: h.leads,
                            searchQuery: h.domain,
                            loading: false,
                            error: null,
                          });
                          saveSearchResultsToStorage(h.domain, h.leads);
                        } else {
                          console.log("❌ No results found anywhere");
                          useLeadStore.setState({
                            leads: [],
                            searchQuery: h.domain,
                            loading: false,
                            error: null,
                          });
                        }
                      } catch (error) {
                        console.error("❌ Error retrieving from database:", error);
                        // Fallback to history leads
                        if (h.leads && h.leads.length > 0) {
                          useLeadStore.setState({
                            leads: h.leads,
                            searchQuery: h.domain,
                            loading: false,
                            error: null,
                          });
                        }
                      }
                      setLoadingCompanyData(null);
                      navigate("/results");
                    }}
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "14px", fontWeight: "600", color: "var(--text1)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "3px"
                        }}>
                          {h.domain}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text2)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{h.date}</span>
                          <span style={{ opacity: 0.6 }}>·</span>
                          <span style={{ color: "var(--text1)", fontWeight: "600" }}>{h.leadsFound} leads</span>
                        </div>
                      </div>
                    </div>
                    {/* Right: Badge */}
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryItem(h.id);
                      }}
                      title="Delete this activity"
                      style={{
                        minWidth: "34px",
                        height: "34px",
                        borderRadius: "9px",
                        flexShrink: 0,
                        color: "var(--text2)",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text2)"}
                    >
                      <Trash2 size={14} />
                    </button>
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
                    onClick={async () => {
                      console.log("🏢 Top Companies row clicked:", company.company);
                      setLoadingCompanyData(company.company);
                      
                      // Try to get from database first
                      try {
                        console.log("🔍 Retrieving company results from database...");
                        const dbLeads = await getCompanySearchResultsFromDatabase(company.company);
                        
                        if (dbLeads.length > 0) {
                          console.log("✅ Retrieved company results from database:", dbLeads.length);
                          useLeadStore.setState({
                            leads: dbLeads,
                            searchQuery: company.company,
                            loading: false,
                            error: null,
                          });
                          saveSearchResultsToStorage(company.company, dbLeads);
                        } else {
                          console.log("❌ No database results, checking history leads...");
                          // Fallback to history items
                          const companyHistoryItems = history.filter(h => h.domain === company.company);
                          const allCompanyLeads = companyHistoryItems.flatMap(h => h.leads || []);
                          
                          if (allCompanyLeads.length > 0) {
                            console.log("✅ Using history leads:", allCompanyLeads.length);
                            useLeadStore.setState({
                              leads: allCompanyLeads,
                              searchQuery: company.company,
                              loading: false,
                              error: null,
                            });
                            saveSearchResultsToStorage(company.company, allCompanyLeads);
                          } else {
                            console.log("❌ No results found, showing empty state");
                            useLeadStore.setState({
                              leads: [],
                              searchQuery: company.company,
                              loading: false,
                              error: null,
                            });
                          }
                        }
                      } catch (error) {
                        console.error("❌ Error retrieving from database:", error);
                        // Fallback to history leads
                        const companyHistoryItems = history.filter(h => h.domain === company.company);
                        const allCompanyLeads = companyHistoryItems.flatMap(h => h.leads || []);
                        
                        if (allCompanyLeads.length > 0) {
                          useLeadStore.setState({
                            leads: allCompanyLeads,
                            searchQuery: company.company,
                            loading: false,
                            error: null,
                          });
                        } else {
                          useLeadStore.setState({
                            leads: [],
                            searchQuery: company.company,
                            loading: false,
                            error: "Failed to load company data",
                          });
                        }
                      }
                      setLoadingCompanyData(null);
                      navigate("/results");
                    }}
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "14px", fontWeight: "600", color: "var(--text1)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px"
                        }}>
                          {company.company}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text2)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "var(--text1)", fontWeight: "600" }}>{company.leads} leads total</span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryByDomain(company.company);
                      }}
                      title="Delete this company from activity"
                      style={{
                        minWidth: "36px",
                        height: "36px",
                        borderRadius: "9px",
                        flexShrink: 0,
                        color: "var(--text2)",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text2)"}
                    >
                      <Trash2 size={14} />
                    </button>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>
              {formatDateRange(getDateRange().start, getDateRange().end)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <MiniTrendChart
                title="Searches vs Leads Found"
                subtitle={`Total ${searchesCount} searches · ${leadsFoundCount} leads found`}
                labels={trendBuckets.map((b) => b.label)}
                seriesA={trendBuckets.map((b) => b.searches)}
                seriesB={trendBuckets.map((b) => b.leadsFound)}
                seriesAName="Searches Count"
                seriesBName="Leads Found"
                seriesAColor="#3b82f6"
                seriesBColor="#f59e0b"
              />
              <MiniTrendChart
                title="Leads Saved vs Save Rate"
                subtitle={`Total ${leadsSavedCount} leads saved · ${saveRatePercent}% save rate`}
                labels={trendBuckets.map((b) => b.label)}
                seriesA={trendBuckets.map((b) => b.leadsSaved)}
                seriesB={trendBuckets.map((b) => b.saveRate)}
                seriesAName="Leads Saved"
                seriesBName="Save Rate %"
                seriesAColor="#10b981"
                seriesBColor="#ef4444"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}