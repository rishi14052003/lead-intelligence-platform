import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  ArrowRight,
  Globe,
  Users,
  Shield,
} from "lucide-react";
import { useLeadStore } from "../store/leadStore";
import { useHistoryStore } from "../store/historyStore";
import { saveSearchResultsToDatabase } from "../services/searchResultsService";
import SearchProgress from "../components/feedback/SearchProgress";

const FEATURES = [
  {
    icon: Globe,
    title: "Web Intelligence",
    desc: "Scrapes company websites, contact pages, and public data sources automatically.",
    color: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.2)",
  },
  {
    icon: Users,
    title: "Executive Finder",
    desc: "Identifies CEOs, CTOs, VPs and key decision makers with verified profiles.",
    color: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    icon: Shield,
    title: "Data Quality",
    desc: "Filters generic emails, deduplicates entries, and validates LinkedIn profiles.",
    color: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.2)",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter Company",
    desc: "Type any company name to begin discovery.",
  },
  {
    step: "02",
    title: "Add Location",
    desc: "Optionally enter state and country for precise targeting.",
  },
  {
    step: "03",
    title: "Get Leads",
    desc: "Receive scored, verified decision-maker contacts.",
  },
];

export default function SearchPage() {
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"company" | "location" | null>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { search, loading } = useLeadStore();
  const { addHistory } = useHistoryStore();

  useEffect(() => {
    const timer = setTimeout(() => companyInputRef.current?.focus(), 600);
    return () => clearTimeout(timer);
  }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCompany = company.trim();
    const trimmedLocation = location.trim();
    
    if (!trimmedCompany) {
      setError("Enter a company name to get started.");
      return;
    }
    
    setError("");
    try {
      const searchResults = await search(trimmedCompany, trimmedLocation);
      const displayQuery = trimmedLocation 
        ? `${trimmedCompany}, ${trimmedLocation}`
        : trimmedCompany;
      
      // Save search results to database (async, don't wait for completion)
      saveSearchResultsToDatabase(displayQuery, searchResults, trimmedLocation).catch(error => {
        console.error("Failed to save search results to database:", error);
      });
      
      addHistory({
        id: Date.now().toString(),
        domain: displayQuery,
        date: new Date().toLocaleDateString(),
        leadsFound: searchResults.length,
        leads: searchResults, // Store the actual leads data
      });
      navigate("/results");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      {loading && <SearchProgress companyName={location ? `${company}, ${location}` : company} />}

      <div className="search-page-v2 mounted">
        <div className="search-orb search-orb-1" />
        <div className="search-orb search-orb-2" />
        <div className="search-orb search-orb-3" />

        <div
          className="search-hero-v2"
          style={{ maxWidth: 900, paddingTop: 0 }}
        >
          <h1 className="search-headline">
            Find the right
            <span className="search-headline-accent"> decision makers</span>
          </h1>

          <p className="search-subline" style={{ fontSize: 17, maxWidth: 600 }}>
            Enter a company name and optionally add location to find CEOs, CTOs, and key executives —
            complete with emails, LinkedIn profiles, and AI relevance scores.
          </p>

          <div
            className={`search-card-v2 ${focused ? "focused" : ""} ${error ? "has-error" : ""}`}
            style={{
              maxWidth: "100%",
              ...(focused && {
                borderColor: "var(--accent, #f97316)",
                boxShadow: "0 0 0 3px rgba(249,115,22,0.18)",
              }),
            }}
          >
            <form
              onSubmit={onSearch}
              style={{ outline: "none", boxShadow: "none" }}
            >
              {/* Company Name Input */}
              <div
                style={{
                  padding: "16px",
                  borderBottom: "1px solid var(--border, #e5e7eb)",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text2, #6b7280)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Company Name
                </label>
                <div
                  className="search-field-wrap"
                  style={{ padding: 0, position: "relative" }}
                >
                  <div className="search-field-icon">
                    <SearchIcon size={19} />
                  </div>
                  <input
                    ref={companyInputRef}
                    className="search-field-input"
                    placeholder="Enter company name or domain"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      setError("");
                    }}
                    onFocus={() => setFocused("company")}
                    onBlur={() => setFocused(null)}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                    style={{ fontSize: 16, padding: "10px 0" }}
                  />
                </div>
              </div>

              {/* Location Input */}
              <div style={{ padding: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text2, #6b7280)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Location <span style={{ fontWeight: 400, color: "var(--text3, #9ca3af)" }}>(Optional)</span>
                </label>
                <div
                  className="search-field-wrap"
                  style={{ padding: 0, position: "relative" }}
                >
                  <div className="search-field-icon">
                    <Globe size={19} />
                  </div>
                  <input
                    className="search-field-input"
                    placeholder="Enter city, state, country for accurate data"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setError("");
                    }}
                    onFocus={() => setFocused("location")}
                    onBlur={() => setFocused(null)}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                    style={{ fontSize: 16, padding: "10px 0" }}
                  />
                </div>
              </div>

              {/* Search Button */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "8px 16px 16px",
                }}
              >
                <button
                  type="submit"
                  className="search-field-btn"
                  disabled={loading || !company.trim()}
                  style={{ 
                    padding: "12px 26px", 
                    fontSize: 15,
                    flex: 1,
                  }}
                >
                  {loading ? (
                    <span className="search-field-spinner" />
                  ) : (
                    <>
                      <span>Search</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
              {error && (
                <div className="search-error-msg" style={{ margin: "0 16px 16px" }}>
                  <span className="search-error-dot" />
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>

        <div
          className="search-features-section"
          style={{ marginTop: 12, maxWidth: 900 }}
        >
          <p className="search-features-eyebrow">How it works</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              marginBottom: 12,
            }}
          >
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                className="search-feature-card"
                style={{
                  animationDelay: `${0.05 + i * 0.08}s`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "18px 16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: "var(--accent)",
                    opacity: 0.7,
                  }}
                >
                  STEP {step.step}
                </span>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text)",
                    letterSpacing: -0.3,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text2)",
                    lineHeight: 1.65,
                  }}
                >
                  {step.desc}
                </div>
              </div>
            ))}
          </div>

          <p className="search-features-eyebrow">What you get</p>
          <div
            className="search-features-grid"
            style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
          >
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="search-feature-card"
                style={{
                  animationDelay: `${0.2 + i * 0.08}s`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "18px 16px",
                }}
              >
                <div
                  className="search-feature-icon-wrap"
                  style={{
                    background: f.color,
                    borderColor: f.border,
                    color: "var(--accent)",
                    width: 42,
                    height: 42,
                  }}
                >
                  <f.icon size={18} />
                </div>
                <h3
                  className="search-feature-title"
                  style={{ fontSize: 17, fontWeight: 700, marginTop: 0 }}
                >
                  {f.title}
                </h3>
                <p
                  className="search-feature-desc"
                  style={{ fontSize: 14, lineHeight: 1.65, margin: 0 }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}