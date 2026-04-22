import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Zap } from "lucide-react";
import { useLeadStore } from "../store/leadStore";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const search = useLeadStore((s) => s.search);
  
  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    await search(query);
    setLoading(false);
    navigate("/results");
  };

  return (
    <div>
      <div className="search-hero" style={{ padding: "10px 0 32px" }}>
        <div className="hero-pill">
          <Zap size={12} /> AI-Powered Lead Discovery
        </div>
        <div className="hero-title">
          Find <span className="grad">Decision Makers</span> at any company
        </div>
        <div className="hero-sub">
          Discover CEOs, CTOs, HR leads, and more. Enter a company domain to instantly surface verified contacts.
        </div>

        <div className="search-box" style={{ padding: "48px", height: "400px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="search-label">Company Domain</div>
          <form onSubmit={onSearch}>
            <div className="search-input-wrap">
              <SearchIcon className="search-input-icon" size={16} />
              <input
                className="search-input"
                placeholder="e.g. tesla.com, stripe.com"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ 
                border: "2px solid #ffffff", 
                backgroundColor: "#6c63ff",
                boxShadow: "0 4px 20px rgba(108, 99, 255, 0.3)",
                padding: "8px 16px",
                fontSize: "12px",
                width: "50%",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                fontWeight: "bold"
              }}
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} /> Searching...</>
              ) : (
                <><SearchIcon size={16} /> <span style={{ fontSize: "13px" }}>Search Leads</span></>
              )}
            </button>
          </form>
        </div>

        
      </div>
    </div>
  );
}