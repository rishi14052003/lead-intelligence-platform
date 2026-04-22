import React from "react";
import type { Lead } from "../../services/searchService";
import Badge from "../ui/Badge";

type Props = {
  leads: Lead[];
};

export default function LeadsTable({ leads }: Props) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">LinkedIn</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((l, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{l.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{l.role}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">{l.email || "—"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                {l.linkedin ? (
                  <a href={l.linkedin} target="_blank" rel="noreferrer" className="hover:underline">
                    Profile
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {typeof l.score === "number" ? <Badge>{l.score}</Badge> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
