import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  ArrowRight,
  Globe,
  Users,
  Shield,
  Building2,
  MapPin,
  Zap,
  Sparkles,
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
    iconColor: "#f97316",
    step: "01",
  },
  {
    icon: Users,
    title: "Executive Finder",
    desc: "Identifies CEOs, CTOs, VPs and key decision makers with verified profiles.",
    color: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    iconColor: "#10b981",
    step: "02",
  },
  {
    icon: Shield,
    title: "Data Quality",
    desc: "Filters generic emails, deduplicates entries, and validates LinkedIn profiles.",
    color: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.2)",
    iconColor: "#a78bfa",
    step: "03",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Building2,
    title: "Enter Company",
    desc: "Type any company name or domain to begin discovery.",
  },
  {
    step: "02",
    icon: MapPin,
    title: "Add Location",
    desc: "Optionally enter state and country for precise targeting.",
  },
  {
    step: "03",
    icon: Zap,
    title: "Get Leads",
    desc: "Receive scored, verified decision-maker contacts instantly.",
  },
];

const EXAMPLE_QUERIES = ["Stripe", "OpenAI", "Shopify", "Notion", "Figma"];

export default function SearchPage() {
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"company" | "location" | null>(null);
  const [mounted, setMounted] = useState(false);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { search, loading } = useLeadStore();
  const { addHistory } = useHistoryStore();

  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true), 60);
    const t2 = setTimeout(() => companyInputRef.current?.focus(), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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
      saveSearchResultsToDatabase(displayQuery, searchResults, trimmedLocation).catch(
        (err) => console.error("Failed to save search results:", err)
      );
      addHistory({
        id: Date.now().toString(),
        domain: displayQuery,
        date: new Date().toLocaleDateString(),
        leadsFound: searchResults.length,
        leads: searchResults,
      });
      navigate("/results");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      {loading && (
        <SearchProgress
          companyName={location ? `${company}, ${location}` : company}
        />
      )}

      <div className={`search-page-v2${mounted ? " mounted" : ""}${loading ? " blur-background" : ""}`}>
        <div className="search-orb search-orb-1" />
        <div className="search-orb search-orb-2" />
        <div className="search-orb search-orb-3" />

        {/* ── Hero ── */}
        <div className="search-hero-v2">
          {/* Status pill */}
          <div className="search-status-pill">
            <span className="search-status-dot" />
            AI-powered lead discovery
          </div>

          <h1 className="search-headline">
            Find the right
            <span className="search-headline-accent"> decision makers</span>
          </h1>

          <p className="search-subline search-subline--lead">
            Enter a company name and optionally add location to find CEOs, CTOs,
            and key executives — complete with emails, LinkedIn profiles, and AI
            relevance scores.
          </p>

          {/* ── Search Card ── */}
          <div
            className={`search-card-v2${focused ? " focused" : ""}${error ? " has-error" : ""}`}
          >
            <form onSubmit={onSearch}>
              {/* Company field */}
              <div className="search-field-group">
                <label className="search-form-label">
                  <Building2 size={13} strokeWidth={2.5} />
                  Company Name
                </label>
                <div className="search-field-wrap">
                  <div className="search-field-icon">
                    <SearchIcon size={18} />
                  </div>
                  <input
                    ref={companyInputRef}
                    className="search-field-input"
                    placeholder="Enter company name or domain"
                    value={company}
                    onChange={(e) => { setCompany(e.target.value); setError(""); }}
                    onFocus={() => setFocused("company")}
                    onBlur={() => setFocused(null)}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {company && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => { setCompany(""); companyInputRef.current?.focus(); }}
                      tabIndex={-1}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="search-field-divider" />

              {/* Location field */}
              <div className="search-field-group">
                <label className="search-form-label">
                  <MapPin size={13} strokeWidth={2.5} />
                  Location
                  <span className="search-form-label-optional">(Optional)</span>
                </label>
                <div className="search-field-wrap">
                  <div className="search-field-icon">
                    <Globe size={18} />
                  </div>
                  <input
                    className="search-field-input"
                    placeholder="City, state or country for accurate results"
                    value={location}
                    onChange={(e) => { setLocation(e.target.value); setError(""); }}
                    onFocus={() => setFocused("location")}
                    onBlur={() => setFocused(null)}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Button row */}
              <div className="search-btn-row">
                <button
                  type="submit"
                  className="search-field-btn"
                  disabled={loading || !company.trim()}
                >
                  {loading ? (
                    <>
                      <span className="search-field-spinner" />
                      Searching…
                    </>
                  ) : (
                    <>
                      <SearchIcon size={15} />
                      Search
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="search-error-msg">
                  <span className="search-error-dot" />
                  {error}
                </div>
              )}
            </form>

            {/* Example chips */}
            <div className="search-examples-row">
              <span className="search-examples-label">Try:</span>
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  className="search-example-chip"
                  onClick={() => setCompany(q)}
                  disabled={loading}
                  type="button"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="search-features-section search-features-section--full">
          <p className="search-features-eyebrow">How it works</p>
          <div className="search-how-grid">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                className="search-feature-card search-step-card search-how-works-card"
                style={{ animationDelay: `${0.05 + i * 0.08}s` }}
              >
                <div className="search-step-top">
                  <span className="search-step-num">STEP {step.step}</span>
                  <div className="search-step-icon-wrap">
                    <step.icon size={16} />
                  </div>
                </div>
                <div className="search-how-step-title">{step.title}</div>
                <div className="search-how-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>

          {/* ── What You Get — now matches How It Works card layout ── */}
          <div className="search-what-you-get-strip">
            <p className="search-features-eyebrow search-features-eyebrow--what-you-get">
              What you get
            </p>
            <div className="search-how-grid search-what-grid">
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="search-feature-card search-step-card search-wyg-card"
                  style={{ animationDelay: `${0.2 + i * 0.08}s` }}
                >
                  <div className="search-step-top">
                    <span className="search-step-num search-wyg-num">
                      <Sparkles size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                      FEATURE {f.step}
                    </span>
                    <div
                      className="search-step-icon-wrap"
                      style={{
                        background: f.color,
                        borderColor: f.border,
                        color: f.iconColor,
                      }}
                    >
                      <f.icon size={16} />
                    </div>
                  </div>
                  <div className="search-how-step-title">{f.title}</div>
                  <div className="search-how-step-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}