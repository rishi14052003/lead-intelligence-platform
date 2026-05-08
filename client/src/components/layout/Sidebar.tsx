import { useLocation, Link } from "react-router-dom";
import { useState } from "react";
import { Search, List, BarChart3, Bookmark } from "lucide-react";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/search", label: "Search", icon: Search },
  { path: "/saved", label: "Saved Leads", icon: Bookmark },
  { path: "/results", label: "Results", icon: List },
];

export default function Sidebar() {
  const location = useLocation();
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const toggleItemSelection = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  return (
    <div className="w-56 glass h-screen fixed left-0 top-0 animate-fade-in">
      <div className="p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        <h1 className="text-lg font-bold text-gradient">Lead Finder</h1>
      </div>
      <nav className="px-2 py-4">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const IconComponent = item.icon;
          return (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Link
                key={item.path}
                to={item.path}
                onClick={() => toggleItemSelection(index)}
                className={`sidebar-nav ${
                  isActive
                    ? "sidebar-nav-active"
                    : "sidebar-nav-inactive"
                }`}
                style={{ flex: 1 }}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                <span className="ml-3 text-sm font-medium">{item.label}</span>
              </Link>
              {selectedItems.has(index) && (
                <span style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#3b82f6",
                  boxShadow: "0 0 6px rgba(59, 130, 246, 0.8)",
                  border: "2px solid #ffffff",
                  marginRight: 8,
                  flexShrink: 0
                }} />
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
