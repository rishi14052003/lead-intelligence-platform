import { useLeadStore } from "../../store/leadStore";
import { ChevronDown } from "lucide-react";

const ROLES = ["All", "CEO", "CTO", "CFO", "COO", "CMO", "HR Manager", "Sales Manager", "Product Manager", "Engineering Manager"];

export default function RoleFilter() {
  const roleFilter = useLeadStore((s) => s.roleFilter);
  const setRoleFilter = useLeadStore((s) => s.setRoleFilter);

  return (
    <div className="relative">
      <select
        value={roleFilter || "All"}
        onChange={(e) => setRoleFilter(e.target.value === "All" ? null : e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}
