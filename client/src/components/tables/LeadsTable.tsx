import type { Lead } from "../../services/searchService";
import Button from "../ui/Button";
import { ExternalLink, Bookmark, Download } from "lucide-react";

type Props = {
  leads: Lead[];
  selectedLeads?: Set<string>;
  onSelectLead?: (leadId: string, checked: boolean) => void;
  showCheckbox?: boolean;
};

export default function LeadsTable({ leads, selectedLeads = new Set(), onSelectLead, showCheckbox = false }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {showCheckbox && (
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                <input type="checkbox" className="w-4 h-4" disabled style={{ cursor: 'default' }} />
              </th>
            )}
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Role</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Email</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">LinkedIn</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Company URL</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Score</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead, idx) => (
            <tr key={lead.id || idx} className="hover:bg-gray-50 transition-colors border-b border-gray-200">
              {showCheckbox && (
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={lead.id ? selectedLeads.has(lead.id) : false}
                    onChange={(e) => {
                      if (lead.id && onSelectLead) {
                        onSelectLead(lead.id, e.target.checked);
                      }
                    }}
                    className="w-4 h-4"
                    style={{ cursor: 'pointer' }}
                  />
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-base font-semibold text-gray-900">{lead.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-base text-gray-700">{lead.role}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-base text-indigo-600 hover:text-indigo-900 font-medium">
                    {lead.email}
                  </a>
                ) : (
                  <span className="text-base text-gray-400">–</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {lead.linkedin ? (
                  <a 
                    href={lead.linkedin} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-base text-indigo-600 hover:text-indigo-900 flex items-center font-medium"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Profile
                  </a>
                ) : (
                  <span className="text-base text-gray-400">–</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {lead.companyUrl ? (
                  <a 
                    href={lead.companyUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-base text-indigo-600 hover:text-indigo-900 flex items-center font-medium"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Website
                  </a>
                ) : (
                  <span className="text-base text-gray-400">–</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {typeof lead.score === "number" ? (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(lead.score)}`}>
                    {lead.score}
                  </span>
                ) : (
                  <span className="text-base text-gray-400">–</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base font-medium">
                <div className="flex gap-3">
                  <Button variant="ghost" className="text-sm px-3 py-2">
                    <Bookmark className="w-5 h-5 mr-2" />
                    Save
                  </Button>
                  <Button variant="ghost" className="text-sm px-3 py-2">
                    <Download className="w-5 h-5 mr-2" />
                    Export
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
