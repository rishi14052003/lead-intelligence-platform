import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Zap } from "lucide-react";
import { useLeadStore } from "../store/leadStore";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const search = useLeadStore((s) => s.search);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      await search(query.trim());
      navigate("/results");
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="search-hero" style={{ padding: "10px 0 32px" }}>
        <div className="hero-pill" style={{ fontSize: "16px" }}>
          <Zap size={12} /> AI-Powered Lead Discovery
        </div>

        <div className="hero-title">
          Find <span className="grad">Decision Makers</span> at any company
        </div>

        <div className="hero-sub">
          Discover CEOs, CTOs, HR leads, and more.
        </div>

        <div className="search-box" style={{ padding: "48px", height: "400px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <form onSubmit={onSearch}>
            <div className="search-input-wrap">
              <SearchIcon size={16} />
              <input
                className="search-input"
                placeholder="e.g. tesla.com"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !query.trim()}
            >
              {loading ? "Searching..." : "Search Leads"}
            </button>

            {error && <p style={{ color: "red" }}>{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}