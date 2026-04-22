import React, { useState } from "react";
import Container from "../components/layout/Container";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import LeadsTable from "../components/tables/LeadsTable";
import RoleFilter from "../components/filters/RoleFilter";
import EmptyState from "../components/feedback/EmptyState";
import ErrorMessage from "../components/feedback/ErrorMessage";
import { useLeadStore } from "../store/leadStore";

export default function Search() {
  const [query, setQuery] = useState("");
  const search = useLeadStore((s) => s.search);
  const leads = useLeadStore((s) => s.leads);
  const loading = useLeadStore((s) => s.loading);
  const error = useLeadStore((s) => s.error);
  const roleFilter = useLeadStore((s) => s.roleFilter);

  const filtered = roleFilter ? leads.filter((l) => l.role?.toLowerCase() === roleFilter.toLowerCase()) : leads;

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query) return;
    await search(query);
  }

  return (
    <Container>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-2xl font-semibold mb-4">Lead Finder</h1>
          <form onSubmit={onSearch} className="flex gap-3 items-start">
            <Input placeholder="Enter company domain (e.g. tesla.com)" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="flex flex-col gap-2">
              <Button type="submit">Search</Button>
              <RoleFilter />
            </div>
          </form>
        </div>

        <div className="mt-6">
          {loading && (
            <div className="bg-white rounded-xl shadow p-6 flex items-center gap-3">
              <Spinner size={20} />
              <span>Searching...</span>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {!loading && !error && leads.length === 0 && (
            <div className="mt-4">
              <EmptyState title="No results" subtitle="Try another domain or check spelling." />
            </div>
          )}

          {!loading && !error && leads.length > 0 && (
            <div className="mt-4">
              <LeadsTable leads={filtered} />
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
import { useState } from "react";

type Lead = {
  name: string;
  role: string;
  email: string;
  linkedin?: string;
  score?: number;
};

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;

    setLoading(true);

    // MOCK DATA (replace later with API)
    setTimeout(() => {
      const mockData: Lead[] = [
        {
          name: "Elon Musk",
          role: "CEO",
          email: "elon@tesla.com",
          linkedin: "https://linkedin.com",
          score: 95,
        },
        {
          name: "John Doe",
          role: "CTO",
          email: "john@tesla.com",
          linkedin: "https://linkedin.com",
          score: 88,
        },
      ];

      setResults(mockData);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      
      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <h1 className="text-3xl font-semibold">Lead Finder</h1>
        <p className="text-gray-500">
          Find CEOs, CTOs, and key decision makers
        </p>
      </div>

      {/* Search Box */}
      <div className="w-full max-w-3xl bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter company domain (e.g. tesla.com)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          <button
            onClick={handleSearch}
            className="bg-black text-white px-6 rounded-xl hover:bg-gray-800 transition"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="w-full max-w-3xl mt-6 space-y-3">
        
        {!loading && results.length === 0 && (
          <div className="text-center text-gray-400 mt-6">
            No results yet. Try searching a company.
          </div>
        )}

        {results.map((lead, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{lead.name}</p>
              <p className="text-gray-500 text-sm">{lead.role}</p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-700">{lead.email}</p>
              {lead.score && (
                <p className="text-xs text-gray-400">
                  Score: {lead.score}%
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-center text-gray-500 mt-6">
            Loading results...
          </div>
        )}
      </div>
    </div>
  );
}