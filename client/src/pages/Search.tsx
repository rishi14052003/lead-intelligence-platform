import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  ArrowRight,
  Globe,
  Users,
  TrendingUp,
  Shield,
  Sparkles,
} from "lucide-react";
import { useLeadStore } from "../store/leadStore";
import SearchProgress from "../components/feedback/SearchProgress";

const EXAMPLE_DOMAINS = ["Stripe", "OpenAI", "Notion", "Vercel", "Figma", "Linear"];

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
    icon: TrendingUp,
    title: "Lead Scoring",
    desc: "AI-powered scoring ranks leads by relevance, role seniority, and data completeness.",
    color: "rgba(56,189,248,0.1)",
    border: "rgba(56,189,248,0.2)",
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
  { step: "01", title: "Enter Company", desc: "Type any company name to begin discovery." },
  { step: "02", title: "AI Scrapes", desc: "We scan websites, LinkedIn, and public data." },
  { step: "03", title: "Get Leads", desc: "Receive scored, verified decision-maker contacts." },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { search, loading } = useLeadStore();

  useEffect(() => {
    setMounted(true);
    setTimeout(() => inputRef.current?.focus(), 600);
  }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Enter a company name to get started.");
      return;
    }
    setError("");
    try {
      await search(trimmed);
      navigate("/results");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const handleExample = (domain: string) => {
    setQuery(domain);
    setError("");
    inputRef.current?.focus();
  };

  return (
    <div className={`search-page-v2 ${mounted ? "mounted" : ""}`}>
      {/* Loading Progress Overlay */}
      {loading && <SearchProgress />}

      <div className="search-orb search-orb-1" />
      <div className="search-orb search-orb-2" />
      <div className="search-orb search-orb-3" />

      {/* Hero */}
      <div className="search-hero-v2" style={{ maxWidth: 900 }}>

        <div className="search-badge">
          <Sparkles size={13} />
          <span>AI-Powered Lead Discovery Engine</span>
        </div>

        <h1 className="search-headline">
          Find the right
          <span className="search-headline-accent"> decision makers</span>
        </h1>

        <p className="search-subline" style={{ fontSize: 17, maxWidth: 600 }}>
          Enter any company name and surface CEOs, CTOs, and key executives —
          complete with emails, LinkedIn profiles, and AI relevance scores.
        </p>

        {/* Search Card */}
        <div
          className={`search-card-v2 ${focused ? "focused" : ""} ${error ? "has-error" : ""}`}
          style={{ maxWidth: "100%" }}
        >
          <form onSubmit={onSearch}>
            <div className="search-field-wrap" style={{ padding: "8px 8px 8px 18px" }}>
              <div className="search-field-icon">
                <SearchIcon size={19} />
              </div>
              <input
                ref={inputRef}
                className="search-field-input"
                placeholder="e.g. Stripe, OpenAI, Notion…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setError(""); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
                style={{ fontSize: 16, padding: "10px 0" }}
              />
              <button
                type="submit"
                className="search-field-btn"
                disabled={loading || !query.trim()}
                style={{ padding: "12px 26px", fontSize: 15 }}
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
              <div className="search-error-msg">
                <span className="search-error-dot" />
                {error}
              </div>
            )}
          </form>

          <div className="search-examples-row" style={{ marginTop: 16 }}>
            <span className="search-examples-label" style={{ fontSize: 13 }}>Try:</span>
            {EXAMPLE_DOMAINS.map((d) => (
              <button
                key={d}
                className="search-example-chip"
                onClick={() => handleExample(d)}
                disabled={loading}
                type="button"
                style={{ fontSize: 13, padding: "5px 14px" }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works + Features */}
      <div
        className="search-features-section"
        style={{ marginTop: 56, maxWidth: 900 }}
      >
        <p className="search-features-eyebrow">How it works</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 48,
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
                gap: 12,
                padding: "28px 24px",
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
          style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="search-feature-card"
              style={{
                animationDelay: `${0.2 + i * 0.08}s`,
                padding: "24px 20px",
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
                style={{ fontSize: 15, marginTop: 4 }}
              >
                {f.title}
              </h3>
              <p
                className="search-feature-desc"
                style={{ fontSize: 13.5, lineHeight: 1.65 }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}