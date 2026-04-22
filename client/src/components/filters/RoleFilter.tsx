import { useLeadStore } from "../../store/leadStore";

const ROLES = ["All", "CEO", "CTO", "HR"];

export default function RoleFilter() {
  const roleFilter = useLeadStore((s) => s.roleFilter);
  const setRoleFilter = useLeadStore((s) => s.setRoleFilter);

  return (
    <select
      value={roleFilter || "All"}
      onChange={(e) => setRoleFilter(e.target.value === "All" ? null : e.target.value)}
      className="px-3 py-2 border rounded-md"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
