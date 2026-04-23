import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Zap, ArrowRight, Globe, Users, TrendingUp, Shield } from "lucide-react";
import { useLeadStore } from "../store/leadStore";

const EXAMPLE_DOMAINS = ["stripe.com", "openai.com", "notion.so", "vercel.com", "figma.com"];

const FEATURES = [
  {
    icon: Globe,
    title: "Web Intelligence",
    desc: "Scrapes company websites, contact pages, and public data sources automatically.",
  },
  {
    icon: Users,
    title: "Executive Finder",
    desc: "Identifies CEOs, CTOs, VPs and key decision makers with verified profiles.",
  },
  {
    icon: TrendingUp,
    title: "Lead Scoring",
    desc: "AI-powered scoring ranks leads by relevance, role seniority, and data completeness.",
  },
  {
    icon: Shield,
    title: "Data Quality",
    desc: "Filters generic emails, deduplicates entries, and validates LinkedIn profiles.",
  },
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
      setError("Enter a company domain to get started.");
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
      {/* Ambient background orbs */}
      <div className="search-orb search-orb-1" />
      <div className="search-orb search-orb-2" />
      <div className="search-orb search-orb-3" />

      {/* Hero Section */}
      <div className="search-hero-v2">
        {/* Badge */}
        <div className="search-badge">
          <Zap size={21} />
          <span style={{ fontSize: "19px" }}>AI-Powered Lead Discovery Engine</span>
        </div>

        {/* Headline */}
        <h1 className="search-headline">
          Find the right
          <span className="search-headline-accent"> decision makers</span>
        </h1>

        <p className="search-subline">
          Enter any company domain. We'll surface CEOs, CTOs, and key executives —
          complete with emails, LinkedIn profiles, and relevance scores.
        </p>

        {/* Search Card */}
        <div className={`search-card-v2 ${focused ? "focused" : ""} ${error ? "has-error" : ""}`}>
          <form onSubmit={onSearch}>
            <div className="search-field-wrap">
              <div className="search-field-icon">
                <SearchIcon size={18} />
              </div>
              <input
                ref={inputRef}
                className="search-field-input"
                placeholder="e.g. stripe.com, openai.com"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setError(""); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                className="search-field-btn"
                disabled={loading || !query.trim()}
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
        </div>
      </div>

      {/* Features Grid */}
      <div className="search-features-section">
        <p className="search-features-eyebrow">How it works</p>
        <div className="search-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="search-feature-card" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <div className="search-feature-icon-wrap">
                <f.icon size={18} />
              </div>
              <h3 className="search-feature-title">{f.title}</h3>
              <p className="search-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}