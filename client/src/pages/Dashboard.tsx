import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Users, Bookmark, Search, TrendingUp, Clock, Grid, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function StatCard({ 
  label, 
  value, 
  icon: IconComp, 
  variant = "", 
  iconVariant = "violet", 
  meta = "",
  onClick,
  style,
  valueClassName = "",
  labelClassName = "",
  iconSize = 20
}: { 
  label: string; 
  value: string; 
  icon?: LucideIcon; 
  variant?: string; 
  iconVariant?: string; 
  meta?: string; 
  onClick?: () => void;
  style?: React.CSSProperties;
  valueClassName?: string;
  labelClassName?: string;
  iconSize?: number;
}) {
  return (
    <div className={`stat-card ${variant}`} onClick={onClick} style={style}>
      <div className="stat-top">
        <div>
          <div className={labelClassName || "stat-label"}>{label}</div>
          <div className={valueClassName || `stat-value ${variant}-text`} style={{ marginTop: 6 }}>{value}</div>
          {meta && <div className="stat-meta">{meta}</div>}
        </div>
        <div className={`stat-icon ${iconVariant}`}>
          {IconComp && <IconComp size={iconSize} />}
        </div>
      </div>
    </div>
  );
}

function Card({ title, extra, children, style }: { title?: string; extra?: any; children: any; style?: any }) {
  return (
    <div className="card" style={style}>
      {(title || extra) && (
        <div className="card-header">
          <span className="card-title">{title}</span>
          {extra}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

function EmptyState({ 
  icon: IconComp = Search, 
  title, 
  subtitle,
  iconSize = 20
}: { 
  icon?: LucideIcon; 
  title: string; 
  subtitle: string; 
  iconSize?: number;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{IconComp && <IconComp size={iconSize} />}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{subtitle}</div>
    </div>
  );
}

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  const sunday = new Date(now.setDate(diff + 6));
  return { start: monday, end: sunday };
}

function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end };
}

function getYearRange() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start, end };
}

function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const [performancePeriod, setPerformancePeriod] = useState<'week' | 'month' | 'year'>('week');
  
  const getDateRange = () => {
    if (performancePeriod === 'week') return getWeekRange();
    if (performancePeriod === 'month') return getMonthRange();
    return getYearRange();
  };

  const toggleActionSelection = (index: number) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedActions(newSelected);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Monitor your lead generation performance</div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stats-4">
        <StatCard label="Total Leads" value="0" icon={Users} iconVariant="violet" />
        <StatCard label="Saved Leads" value="0" icon={Bookmark} iconVariant="violet" />
        <StatCard label="Searches" value="0" icon={Search} iconVariant="violet" />
        <StatCard label="Conversion" value="0%" icon={TrendingUp} iconVariant="violet" />
      </div>

      {/* Quick Actions */}
      <div className="stats-grid stats-3" style={{ marginBottom: 14 }}>
        <StatCard 
          label="New Search" 
          value="Start" 
          icon={Search} 
          iconVariant="violet"
          labelClassName="stat-action-label"
          valueClassName="stat-action-value"
          iconSize={19}
          onClick={() => { navigate("/search"); toggleActionSelection(0); }}
          style={{ cursor: "pointer" }}
        />
        <StatCard 
          label="View Saved" 
          value="Manage" 
          icon={Bookmark} 
          iconVariant="violet"
          labelClassName="stat-action-label"
          valueClassName="stat-action-value"
          iconSize={19}
          onClick={() => { navigate("/saved"); toggleActionSelection(1); }}
          style={{ cursor: "pointer" }}
        />
        <StatCard 
          label="View History" 
          value="Check" 
          icon={Clock} 
          iconVariant="violet"
          labelClassName="stat-action-label"
          valueClassName="stat-action-value"
          iconSize={19}
          onClick={() => { navigate("/history"); toggleActionSelection(2); }}
          style={{ cursor: "pointer" }}
        />
      </div>

      <div className="row" style={{ display: 'flex', gap: '14px' }}>
        <div className="col-6" style={{ flex: 1 }}>
          <Card title="Recent Activity" extra={<button className="btn btn-ghost btn-sm">View All</button>} style={{ height: '100%' }}>
            <EmptyState icon={Clock} title="No recent activity" subtitle="Your recent searches and lead activities will appear here." iconSize={24} />
          </Card>
        </div>
        <div className="col-6" style={{ flex: 1 }}>
          <Card title="Top Companies" extra={<button className="btn btn-ghost btn-sm">View All</button>} style={{ height: '100%' }}>
            <EmptyState icon={Grid} title="No data yet" subtitle="Companies with most leads will appear here." iconSize={24} />
          </Card>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Performance Overview</span>
          <div className="filter-pills">
            <button 
              className={`filter-pill ${performancePeriod === 'week' ? 'active' : ''}`}
              onClick={() => setPerformancePeriod('week')}
            >
              Week
            </button>
            <button 
              className={`filter-pill ${performancePeriod === 'month' ? 'active' : ''}`}
              onClick={() => setPerformancePeriod('month')}
            >
              Month
            </button>
            <button 
              className={`filter-pill ${performancePeriod === 'year' ? 'active' : ''}`}
              onClick={() => setPerformancePeriod('year')}
            >
              Year
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="chart-placeholder">
            <BarChart3 size={28} />
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                {formatDateRange(getDateRange().start, getDateRange().end)}
              </div>
              <span>Start searching for leads to see performance metrics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
