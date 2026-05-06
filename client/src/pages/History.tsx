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
  const [itemsPerPage] = useState(7);
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
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistory = history.slice(startIndex, endIndex);

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
        <div className="col-6" style={{ display: "flex", flexDirection: "column", flex: "0 0 70%" }}>
          <div className="card" style={{ marginBottom: 0, display: "flex", flexDirection: "column", flex: 1 }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={19} />
                <span className="card-title">Recent Searches</span>
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
                  <div className="history-list" style={{ flex: 1, overflowY: "auto", marginBottom: 0 }}>
                    {currentHistory.map((h, i) => (
                      <div key={h.id} className="history-item" onClick={() => { navigate("/results"); toggleHistorySelection(i); }} style={{ cursor: "pointer" }}>
                        <div className="history-left">
                          <div className="history-icon-wrapper">
                            <Search size={19} />
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
                  {totalPages > 1 && (
                    <div className="pagination">
                      <span>Showing {startIndex + 1}-{Math.min(endIndex, history.length)} of {history.length} searches</span>
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
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="col-6" style={{ display: "flex", flexDirection: "column", flex: "0 0 30%" }}>
          {/* Search Tips */}
          <div className="card" style={{ marginBottom: 0, display: "flex", flexDirection: "column", flex: 1 }}>
            <div className="card-header">
              <span className="card-title">Search Tips</span>
            </div>
            <div className="card-body" style={{ flex: 1, justifyContent: "center" }}>
              <div className="tips-list" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div className="tip-item" style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div className="tip-icon-wrapper" style={{ background: "rgba(108,99,255,0.15)", color: "var(--accent2)" }}>
                    <Search size={19} />
                  </div>
                  <div className="tip-content">
                    <div className="tip-title">Be Specific</div>
                    <div className="tip-desc">Use exact company domains</div>
                  </div>
                </div>
                <div className="tip-item" style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div className="tip-icon-wrapper" style={{ background: "rgba(16,185,129,0.15)", color: "var(--green)" }}>
                    <Bookmark size={19} />
                  </div>
                  <div className="tip-content">
                    <div className="tip-title">Save Often</div>
                    <div className="tip-desc">Build your lead database</div>
                  </div>
                </div>
                <div className="tip-item" style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div className="tip-icon-wrapper" style={{ background: "rgba(245,158,11,0.15)", color: "var(--yellow)" }}>
                    <Clock size={19} />
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
