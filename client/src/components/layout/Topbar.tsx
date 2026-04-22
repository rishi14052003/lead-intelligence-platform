import { useLeadStore } from "../../store/leadStore";
import { Bell, Loader2, Sun, Moon, Settings, RefreshCw } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export default function Topbar() {
  const { loading } = useLeadStore();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <div className="topbar-shell fixed left-56 right-0 top-0 z-10">
        <div className="h-full px-8 flex items-center justify-between">

          {/* Left */}
          <div className="flex items-center gap-4">
            <span className="topbar-brand">LeadFinder</span>
            {loading && (
              <div className="topbar-loading">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            )}
          </div>

          {/* Right */}
          <div className="topbar-actions">
            <button
              className="topbar-icon-btn"
              title="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <button className="topbar-icon-btn" title="Notifications">
              <Bell size={16} />
            </button>

            <button className="topbar-icon-btn" title="Settings">
              <Settings size={16} />
            </button>

            <button className="topbar-icon-btn" title="Refresh">
              <RefreshCw size={16} />
            </button>

            {/* Divider */}
            <div className="topbar-sep" />

            {/* Avatar */}
            <div className="topbar-avatar" title="Account">
              U
            </div>
          </div>

        </div>
      </div>
    </>
  );
}