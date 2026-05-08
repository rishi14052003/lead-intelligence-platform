import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, TrendingUp, Bookmark, Trash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ExportDropdown from "../components/ExportDropdown";
import { exportToExcel, exportToPDF, exportToWord } from "../utils/exportUtils";
import { useHistoryStore } from "../store/historyStore";
import Dialog from "../components/Dialog";

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
          {IconComp && <IconComp size={19} />}
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "primary" | "default";
  } | null>(null);
  const { history, clearHistory, loadFromLocalStorage } = useHistoryStore();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Calculate pagination
  const totalPages = showAllHistory ? Math.ceil(history.length / itemsPerPage) : 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayHistory = showAllHistory ? history.slice(startIndex, endIndex) : history.slice(0, 4);

  // Calculate top companies by lead count
  const topCompanies = history.reduce((acc: { company: string; leads: number }[], h) => {
    const existing = acc.find(c => c.company === h.domain);
    if (existing) {
      existing.leads += h.leadsFound;
    } else {
      acc.push({ company: h.domain, leads: h.leadsFound });
    }
    return acc;
  }, []).sort((a, b) => b.leads - a.leads);

  // Calculate pagination for top companies
  const companiesPerPage = 4;
  const totalCompanyPages = showAllCompanies ? Math.ceil(topCompanies.length / companiesPerPage) : 1;
  const companyStartIndex = (companiesPage - 1) * companiesPerPage;
  const companyEndIndex = companyStartIndex + companiesPerPage;
  const displayCompanies = showAllCompanies ? topCompanies.slice(companyStartIndex, companyEndIndex) : topCompanies.slice(0, 4);

  // Reset to page 1 when history changes
  useEffect(() => {
    setCurrentPage(1);
  }, [history.length]);

  const toggleHistorySelection = (index: number) => {
    const newSelected = new Set(selectedHistory);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedHistory(newSelected);
  };

  const handleClearHistory = () => {
    setDialogConfig({
      title: "Clear Search History",
      message: "Are you sure you want to clear all search history? This action cannot be undone.",
      onConfirm: async () => {
        clearHistory();
        setDialogOpen(false);
      },
      variant: "danger",
    });
    setDialogOpen(true);
  };

  const handleExport = (format: 'pdf' | 'excel' | 'word') => {
    const exportFilename = `search-history-${new Date().toISOString().split('T')[0]}`;
    
    // Transform history data for export
    const exportData = history.map((h: any) => ({
      domain: h.domain || '-',
      date: h.date || '-',
      leadsFound: h.leadsFound || 0,
    }));
    
    switch (format) {
      case 'excel':
        exportToExcel(exportData, exportFilename, 'Search History');
        break;
      case 'pdf':
        exportToPDF(exportData, exportFilename, 'Search History Export');
        break;
      case 'word':
        exportToWord(exportData, exportFilename, 'Search History Export');
        break;
    }
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
        <StatCard label="Total Searches" value={history.length.toString()} icon={Search} iconVariant="violet" />
        <StatCard label="Companies Found" value={history.length.toString()} icon={Search} iconVariant="violet" />
        <StatCard label="Leads Discovered" value={history.reduce((sum, h) => sum + h.leadsFound, 0).toString()} icon={Bookmark} iconVariant="violet" />
        <StatCard label="Success Rate" value="0%" icon={TrendingUp} iconVariant="violet" />
      </div>

      {/* Main Content Grid */}
      <div className="row" style={{ gap: 14 }}>
        {/* Recent Searches */}
        <div className="col-6" style={{ display: "flex", flexDirection: "column", flex: "0 0 60%" }}>
          <div className="card" style={{ marginBottom: 0, display: "flex", flexDirection: "column", flex: 1 }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={19} />
                <span className="card-title">Recent Activity</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <ExportDropdown onExport={handleExport} disabled={history.length === 0} />
                <button className="btn btn-danger btn-sm" onClick={handleClearHistory} disabled={history.length === 0}>
                  <Trash size={15} /> Clear
                </button>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {history.length === 0 ? (
                <EmptyState 
                  icon={Clock} 
                  title="No search history" 
                  subtitle="Your previous searches will appear here once you start exploring companies." 
                />
              ) : (
                <>
                  <div className="history-list" style={{ flex: 1, overflowY: "auto", marginBottom: 0, minHeight: "300px" }}>
                    {displayHistory.map((h, i) => (
                      <div 
                        key={h.id} 
                        className="history-item" 
                        onClick={() => { navigate("/results"); toggleHistorySelection(i); }} 
                        style={{ 
                          cursor: "pointer",
                          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "12px",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              width: "44px", 
                              height: "44px", 
                              borderRadius: "12px", 
                              background: "linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(108,99,255,0.1) 100%)",
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <Search size={20} style={{ color: "var(--accent)" }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                fontSize: "15px", 
                                fontWeight: "600", 
                                color: "var(--text1)",
                                marginBottom: "4px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}>
                                {h.domain}
                              </div>
                              <div style={{ 
                                fontSize: "13px", 
                                color: "var(--text3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                              }}>
                                <Clock size={12} style={{ opacity: 0.6 }} />
                                <span>{h.date}</span>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span style={{ color: "var(--accent2)", fontWeight: "500" }}>{h.leadsFound} leads found</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                            {selectedHistory.has(i) && (
                              <div style={{ 
                                width: "10", 
                                height: "10", 
                                borderRadius: "50%", 
                                background: "var(--accent)",
                                flexShrink: 0,
                                boxShadow: "0 0 8px rgba(108,99,255,0.5)"
                              }} />
                            )}
                            <div style={{ 
                              width: "40px", 
                              height: "40px", 
                              borderRadius: "10px", 
                              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)",
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              fontWeight: "700",
                              fontSize: "16px",
                              color: "white",
                              boxShadow: "0 4px 12px rgba(108,99,255,0.3)"
                            }}>
                              {h.leadsFound}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 12 }}>
                    {showAllHistory && totalPages > 1 ? (
                      <>
                        <span style={{ fontSize: 12, color: "#888" }}>Showing {startIndex + 1}-{Math.min(endIndex, history.length)} of {history.length} searches</span>
                        <div style={{ display: "flex", gap: 6 }}>
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
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </>
                    ) : (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => { setShowAllHistory(true); setCurrentPage(1); }}
                        disabled={history.length <= 4}
                      >
                        View All
                      </button>
                    )}
                    {showAllHistory && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => { setShowAllHistory(false); setCurrentPage(1); }}
                      >
                        Show Less
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Companies */}
        <div className="col-6" style={{ display: "flex", flexDirection: "column", flex: "0 0 40%" }}>
          <div className="card" style={{ marginBottom: 0, display: "flex", flexDirection: "column", flex: 1 }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={19} />
                <span className="card-title">Top Companies</span>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {topCompanies.length === 0 ? (
                <EmptyState 
                  icon={TrendingUp} 
                  title="No companies yet" 
                  subtitle="Your top searched companies will appear here." 
                />
              ) : (
                <>
                  <div className="history-list" style={{ flex: 1, overflowY: "auto", marginBottom: 0, minHeight: "300px" }}>
                    {displayCompanies.map((c, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          cursor: "default",
                          background: "linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(108,99,255,0.04) 100%)",
                          border: "1px solid rgba(108,99,255,0.15)",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "12px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              width: "44px", 
                              height: "44px", 
                              borderRadius: "12px", 
                              background: "linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(168,85,247,0.1) 100%)",
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <Bookmark size={20} style={{ color: "var(--accent2)" }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                fontSize: "15px", 
                                fontWeight: "600", 
                                color: "var(--text1)",
                                marginBottom: "4px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}>
                                {c.company}
                              </div>
                              <div style={{ 
                                fontSize: "13px", 
                                color: "var(--text3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                              }}>
                                <TrendingUp size={12} style={{ opacity: 0.6 }} />
                                <span style={{ color: "var(--accent2)", fontWeight: "500" }}>{c.leads} leads found</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ 
                            width: "40px", 
                            height: "40px", 
                            borderRadius: "10px", 
                            background: "linear-gradient(135deg, var(--accent2) 0%, var(--accent) 100%)",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "16px",
                            color: "white",
                            boxShadow: "0 4px 12px rgba(168,85,247,0.3)",
                            flexShrink: 0
                          }}>
                            {c.leads}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 12 }}>
                    {showAllCompanies && totalCompanyPages > 1 ? (
                      <>
                        <span style={{ fontSize: 12, color: "#888" }}>Showing {companyStartIndex + 1}-{Math.min(companyEndIndex, topCompanies.length)} of {topCompanies.length} companies</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => setCompaniesPage(p => Math.max(1, p - 1))}
                            disabled={companiesPage === 1}
                          >
                            Prev
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => setCompaniesPage(p => Math.min(totalCompanyPages, p + 1))}
                            disabled={companiesPage === totalCompanyPages}
                          >
                            Next
                          </button>
                        </div>
                      </>
                    ) : (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => { setShowAllCompanies(true); setCompaniesPage(1); }}
                        disabled={topCompanies.length <= 4}
                      >
                        View All
                      </button>
                    )}
                    {showAllCompanies && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => { setShowAllCompanies(false); setCompaniesPage(1); }}
                      >
                        Show Less
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

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
