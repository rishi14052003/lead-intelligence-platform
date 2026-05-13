import { useState, useEffect, useCallback } from "react";
import { Search, Users, Mail, Link, Bookmark, Filter, Globe, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLeadStore } from "../store/leadStore";
import { useHistoryStore } from "../store/historyStore";
import { saveLeads } from "../services/leadService";
import { deleteLead } from "../services/leadService";
import { getSavedLeads } from "../services/leadService";
import Dialog from "../components/Dialog";
import ExportDropdown from "../components/ExportDropdown";
import SearchProgress from "../components/feedback/SearchProgress";
import { exportToExcel, exportToPDF, exportToWord } from "../utils/exportUtils";
import type { Lead } from "../services/searchService";

// Sanitize name to remove code/function-like strings
function sanitizeName(name: string): string {
  if (!name) return "Unknown";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "primary" | "default";
  } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedLeadSignatures, setSavedLeadSignatures] = useState<Set<string>>(new Set());
  const [savedLeadIdMap, setSavedLeadIdMap] = useState<Map<string, string>>(new Map());

  const leads = useLeadStore((s) => s.leads);
  const loading = useLeadStore((s) => s.loading);
  const searchQuery = useLeadStore((s) => s.searchQuery);
  const clearLeads = useLeadStore((s) => s.clearLeads);
  const restoreSearchResults = useLeadStore((s) => s.restoreSearchResults);

  const { history } = useHistoryStore();

  useEffect(() => {
    console.log("🔍 Leads data updated:", {
      leadsCount: leads.length,
      loading,
      leads: leads.slice(0, 3),
    });
  }, [leads, loading]);

  // Only restore search results on initial mount if no leads are present
  useEffect(() => {
    console.log("📋 Initial mount - checking if leads need to be restored");
    console.log("📋 Current leads count:", leads.length);
    console.log("📋 History length:", history.length);

    if (leads.length === 0 && history.length > 0) {
      console.log("📋 No leads found but history exists, restoring from localStorage");
      restoreSearchResults();
    } else if (leads.length === 0 && history.length === 0) {
      console.log("📋 No leads and no history, keeping empty");
    } else {
      console.log("📋 Leads already present, not restoring");
    }
  }, [leads.length, history.length, restoreSearchResults]);

  // Fix 1: Wrap getLeadSignature in useCallback so it has a stable reference
  const getLeadSignature = useCallback((lead: Lead): string => {
    return [
      (lead.name || "").toLowerCase().trim(),
      (lead.role || "").toLowerCase().trim(),
      (lead.company || "").toLowerCase().trim(),
      (lead.companyUrl || "").toLowerCase().trim(),
      (lead.email || "").toLowerCase().trim(),
    ].join("|");
  }, []); // no deps — pure function of its argument

  // Fix 2: refreshSavedSignatures uses getLeadSignature (now stable) so the
  // useCallback dep array is valid and the inner setState calls happen inside
  // an async callback, NOT synchronously in the effect body.
  const refreshSavedSignatures = useCallback(async () => {
    try {
      const saved = await getSavedLeads();
      const signatures = new Set<string>();
      const idMap = new Map<string, string>();
      saved.forEach((l) => {
        const sig = getLeadSignature(l);
        signatures.add(sig);
        if (l.id) idMap.set(sig, l.id);
      });
      // These setState calls are inside an async callback resolution,
      // NOT synchronously in the useEffect body — ESLint rule satisfied.
      setSavedLeadSignatures(signatures);
      setSavedLeadIdMap(idMap);
    } catch (error) {
      console.error("Error refreshing saved signatures:", error);
    }
  }, [getLeadSignature]);

  // Load saved lead signatures on mount.
  // refreshSavedSignatures is async — setState only runs after the promise
  // resolves, never synchronously. ESLint can't see through the async
  // boundary so we suppress the false-positive here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSavedSignatures();
  }, [refreshSavedSignatures]);

  // Reset to page 1 when filter or leads change
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [filter, leads.length]);

  const roles = [
    "All",
    "FOUNDERS & OWNERSHIP",
    "TECH & PRODUCT LEADERSHIP",
    "HR & RECRUITMENT",
    "SALES & BUSINESS DEVELOPMENT",
    "MARKETING & OPERATIONS",
  ];

  const getLeadPriority = (category: string | undefined, jobTitle: string): number => {
    const c = (category || "").toLowerCase().trim();
    const t = (jobTitle || "").toLowerCase().trim();
    // Prefer exec ownership titles first, then tech, then revenue/ops.
    if (t.includes("founder") || t.includes("owner") || t.includes("ceo") || t.includes("chief executive")) return 1;
    if (t.includes("cto") || t.includes("chief technology") || c.includes("tech")) return 2;
    if (c.includes("sales") || t.includes("cro") || t.includes("revenue")) return 3;
    if (c.includes("hr") || t.includes("talent") || t.includes("recruit")) return 4;
    if (c.includes("marketing") || t.includes("operations") || t.includes("coo") || t.includes("strategy")) return 5;
    return 9;
  };

  const filtered =
    filter === "All"
      ? leads
          .slice()
          .sort((a, b) => getLeadPriority(a.matchedCategory, a.role) - getLeadPriority(b.matchedCategory, b.role))
      : leads
          .filter((l) => (l.matchedCategory || "") === filter)
          .sort((a, b) => getLeadPriority(a.matchedCategory, a.role) - getLeadPriority(b.matchedCategory, b.role));

  const isLeadSaved = (lead: Lead) => savedLeadSignatures.has(getLeadSignature(lead));

  const getSavedLeadDbId = (lead: Lead): string | null =>
    savedLeadIdMap.get(getLeadSignature(lead)) || null;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = filtered.slice(startIndex, endIndex);

  const handleSaveAll = async () => {
    if (filtered.length === 0) return;
    setSaving(true);
    try {
      await saveLeads(filtered);
      await refreshSavedSignatures();
    } catch (error) {
      console.error("Failed to save leads:", error);
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

  const handleSaveSingle = async (lead: Lead) => {
    const isSaved = isLeadSaved(lead);
    const dbId = getSavedLeadDbId(lead);

    if (isSaved) {
      setDialogConfig({
        title: "Delete Saved Lead",
        message: "Are you sure you want to delete this saved lead?",
        onConfirm: async () => {
          try {
            if (!dbId) throw new Error("Missing lead id for delete");
            await deleteLead(dbId);
            await refreshSavedSignatures();
            setDialogOpen(false);
          } catch (error) {
            console.error("Failed to delete saved lead:", error);
            setDialogConfig({
              title: "Error",
              message: "Failed to delete saved lead",
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
      try {
        await saveLeads([lead]);
        await refreshSavedSignatures();
      } catch (error) {
        console.error("Failed to save lead:", error);
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

  const handleExport = () => {
    setSelectedForExport(new Set());
    setExportDialogOpen(true);
  };

  const handleExportWithFormat = (format: "pdf" | "excel" | "word") => {
    const selectedLeadsForExport = filtered.filter((_, index) => selectedForExport.has(index));

    if (selectedLeadsForExport.length === 0) {
      setDialogConfig({
        title: "No Selection",
        message: "Please select at least one lead to export.",
        onConfirm: () => setDialogOpen(false),
        variant: "default",
      });
      setDialogOpen(true);
      return;
    }

    const exportFilename = `search-results-${new Date().toISOString().split("T")[0]}`;

    switch (format) {
      case "excel":
        exportToExcel(selectedLeadsForExport, exportFilename);
        break;
      case "pdf":
        exportToPDF(selectedLeadsForExport, exportFilename);
        break;
      case "word":
        exportToWord(selectedLeadsForExport, exportFilename);
        break;
    }

    setExportDialogOpen(false);
  };

  return (
    <div>
      {/* Loading Progress */}
      {loading && <SearchProgress />}

      {/* Page Header */}
      <div
        className="page-header"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <div>
          <div className="page-title">Search Results</div>
          {searchQuery ? (
            <div className="page-subtitle">
              Search results for{" "}
              <span className="results-search-query-name">{searchQuery}</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleClear}
            disabled={leads.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minHeight: "36px" }}
          >
            <Trash2 size={14} /> Clear
          </button>
          <ExportDropdown onExport={handleExport} disabled={loading || filtered.length === 0} />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveAll}
            disabled={saving || filtered.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minHeight: "36px" }}
          >
            <Bookmark size={14} /> {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stats-3" style={{ marginBottom: 20 }}>
        <StatCard label="Total Leads" value={leads.length.toString()} icon={Users} iconVariant="violet" />
        <StatCard
          label="With Emails"
          value={leads.filter((l) => l.email).length.toString()}
          icon={Mail}
          iconVariant="violet"
        />
        <StatCard
          label="With LinkedIn"
          value={leads.filter((l) => l.linkedin).length.toString()}
          icon={Link}
          iconVariant="violet"
        />
      </div>

      <div className="card" style={{ marginBottom: 14, display: "flex", flexDirection: "column" }}>
        <div className="card-header">
          <span className="card-title">Lead Results</span>
          <div className="filter-pills">
            <Filter size={16} />
            {roles.map((r) => (
              <button
                key={r}
                className={`filter-pill ${filter === r ? "active" : ""}`}
                onClick={() => setFilter(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <>
            <div className="table-wrap" style={{ tableLayout: "fixed", flex: 1, overflowY: "auto" } as React.CSSProperties}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Name</th>
                    <th style={{ width: "20%" }}>Job Title</th>
                    <th style={{ width: "20%" }}>Email</th>
                    <th style={{ width: "15%" }}>LinkedIn</th>
                    <th style={{ width: "20%" }}>Company URL</th>
                    <th style={{ width: "10%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeads.map((lead, i) => (
                    <tr key={i}>
                      <td>
                        <div className="lead-name">{sanitizeName(lead.name)}</div>
                      </td>
                      <td>
                        <span className="badge badge-purple">{lead.role || "-"}</span>
                      </td>
                      <td>
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} className="email-link">
                            {lead.email}
                          </a>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>
                        {lead.linkedin ? (
                          <a
                            href={lead.linkedin}
                            className="linkedin-link"
                            target="_blank"
                            rel="noopener noreferrer"
                            title={lead.linkedin}
                          >
                            <Link size={12} /> {lead.linkedin}
                          </a>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>
                        {lead.companyUrl ? (
                          <a
                            href={lead.companyUrl}
                            className="company-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Globe size={12} /> {lead.companyUrl}
                          </a>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveSingle(lead);
                            }}
                            style={{
                              color: isLeadSaved(lead) ? "var(--accent)" : "var(--text2)",
                              opacity: isLeadSaved(lead) ? 1 : 0.6,
                            }}
                            title={isLeadSaved(lead) ? "Click to unsave" : "Click to save"}
                          >
                            <Bookmark
                              size={20}
                              fill={isLeadSaved(lead) ? "currentColor" : "none"}
                              strokeWidth={isLeadSaved(lead) ? 0 : 2}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} results
              </span>
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {exportDialogOpen && (
        <div
          className="dialog-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportDialogOpen(false);
          }}
        >
          <div
            className="dialog-content"
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: 12,
              padding: 24,
              maxWidth: 600,
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
                Select Leads to Export
              </h3>
              <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--text2)" }}>
                Choose which leads you want to export. {filtered.length} leads available.
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 0" }}
              >
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedForExport.size === filtered.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForExport(new Set(filtered.map((_, index) => index)));
                    } else {
                      setSelectedForExport(new Set());
                    }
                  }}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  Select All ({filtered.length} leads)
                </span>
              </label>
            </div>

            <div
              style={{
                maxHeight: 300,
                overflow: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 8,
              }}
            >
              {filtered.map((lead, index) => (
                <label
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    padding: "8px 4px",
                    borderBottom: index < filtered.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedForExport.has(index)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedForExport);
                      if (e.target.checked) {
                        newSelected.add(index);
                      } else {
                        newSelected.delete(index);
                      }
                      setSelectedForExport(newSelected);
                    }}
                    style={{ width: 16, height: 16 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                      {sanitizeName(lead.name)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>
                      {lead.role} • {lead.company}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 13, color: "var(--text2)" }}>
                {selectedForExport.size} lead{selectedForExport.size !== 1 ? "s" : ""} selected
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setExportDialogOpen(false)}
                >
                  Cancel
                </button>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExportWithFormat("excel")}
                    disabled={selectedForExport.size === 0}
                  >
                    Export Excel
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExportWithFormat("pdf")}
                    disabled={selectedForExport.size === 0}
                  >
                    Export PDF
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExportWithFormat("word")}
                    disabled={selectedForExport.size === 0}
                  >
                    Export Word
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}