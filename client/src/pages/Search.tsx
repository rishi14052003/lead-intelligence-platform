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