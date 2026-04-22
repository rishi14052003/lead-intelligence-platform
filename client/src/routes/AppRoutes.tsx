import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import SearchPage from "../pages/Search";
import Results from "../pages/Results";
import Dashboard from "../pages/Dashboard";
import SavedLeads from "../pages/SavedLeads";
import History from "../pages/History";
import { Search, List, BarChart3, Bookmark, Clock, Users, Bell, Settings, RefreshCw, X, Moon, Sun, User } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "search", label: "Search", icon: Search },
  { id: "saved", label: "Saved Leads", icon: Bookmark },
  { id: "results", label: "Results", icon: List },
  { id: "history", label: "History", icon: Clock },
];

function DarkSidebar({ currentPage, onNavigate }: { currentPage: string; onNavigate: (page: string) => void }) {
  const userName = "User";
  const userAvatarLetter = (userName.trim()[0] || "U").toUpperCase();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">L</div>
        <div>
          <div className="logo-text" style={{ fontSize: "24px" }}>LeadFinder</div>
          <div className="logo-sub" style={{ fontSize: "24px" }}>Intelligence</div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-label">Navigation</div>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item ${currentPage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{<item.icon size={20} />}</span>
            {item.label}
            {currentPage === item.id && <span className="nav-dot" />}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{userAvatarLetter}</div>
          <div>
            <div className="user-name">{userName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DarkTopbar({
  currentPage: _currentPage,
  theme,
  onToggleTheme,
  onToggleNotifications,
  onToggleSettings,
  showNotifications: _showNotifications,
  showSettings: _showSettings,
}: {
  currentPage: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onToggleNotifications: () => void;
  onToggleSettings: () => void;
  showNotifications: boolean;
  showSettings: boolean;
}) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="breadcrumb">LeadFinder</div>
      </div>
      <div className="topbar-right">
        <button
          className="icon-btn"
          title="Toggle Theme"
          onClick={onToggleTheme}
        >
          {theme === "light" ? <Moon size={24} /> : <Sun size={24} />}
        </button>
        <button
          className="icon-btn"
          title="Notifications"
          onClick={onToggleNotifications}
        >
          <Bell size={24} />
        </button>
        <button
          className="icon-btn"
          title="Settings"
          onClick={onToggleSettings}
        >
          <Settings size={24} />
        </button>
        <button className="icon-btn" title="Refresh">
          <RefreshCw size={24} />
        </button>
        <div className="topbar-right-sep" />
        <button className="icon-btn topbar-avatar" title="Account">
          <User size={24} />
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname.replace("/", "") || "dashboard";
    setCurrentPage(path);
  }, [location]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = (savedTheme as "light" | "dark") || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    navigate(`/${page}`);
  };

  return (
    <div className="app">
      <DarkSidebar currentPage={currentPage} onNavigate={handleNavigate} />
      <DarkTopbar
        currentPage={currentPage}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleNotifications={() => setShowNotifications(v => !v)}
        onToggleSettings={() => setShowSettings(v => !v)}
        showNotifications={showNotifications}
        showSettings={showSettings}
      />
      <div className="main">{children}</div>

      {showNotifications && (
        <div
          className="notifications-overlay"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="notifications-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notifications-header">
              <span className="notifications-title">Notifications</span>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setShowNotifications(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="notifications-content">
              <div className="no-notifications">
                <Bell size={32} />
                <span>No notifications</span>
                <span className="no-notifications-sub">You're all caught up!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div
          className="settings-overlay"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="settings-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-item" onClick={() => { setShowSettings(false); navigate("/dashboard"); }}>
              <div className="settings-icon">
                <BarChart3 size={16} />
              </div>
              <div className="settings-text">
                <div className="settings-title">Dashboard</div>
                <div className="settings-sub">View analytics and insights</div>
              </div>
            </div>

            <div className="settings-item" onClick={() => { setShowSettings(false); navigate("/saved"); }}>
              <div className="settings-icon">
                <Bookmark size={16} />
              </div>
              <div className="settings-text">
                <div className="settings-title">Saved Leads</div>
                <div className="settings-sub">Manage your saved contacts</div>
              </div>
            </div>

            <div className="settings-item" onClick={() => { setShowSettings(false); navigate("/history"); }}>
              <div className="settings-icon">
                <Clock size={16} />
              </div>
              <div className="settings-text">
                <div className="settings-title">Search History</div>
                <div className="settings-sub">View past searches</div>
              </div>
            </div>

            <div className="settings-divider"></div>

            <div className="settings-item" onClick={() => { toggleTheme(); }}>
              <div className="settings-icon">
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div className="settings-text">
                <div className="settings-title">Toggle Theme</div>
                <div className="settings-sub">
                  {theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                </div>
              </div>
            </div>

            <div className="settings-item" onClick={() => { setShowSettings(false); }}>
              <div className="settings-icon">
                <Users size={16} />
              </div>
              <div className="settings-text">
                <div className="settings-title">Account Settings</div>
                <div className="settings-sub">Manage your profile</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/results" element={<Results />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/saved" element={<SavedLeads />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}