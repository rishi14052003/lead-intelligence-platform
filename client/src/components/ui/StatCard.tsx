interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<any>;
  variant?: string;
  iconVariant?: string;
  meta?: string;
}

export function StatCard({
  label,
  value,
  icon: IconComp,
  variant = "",
  iconVariant = "violet",
  meta = "",
}: StatCardProps) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-top">
        <div>
          <div className="stat-label">{label}</div>
          <div className={`stat-value ${variant}-text`} style={{ marginTop: 6 }}>
            {value}
          </div>
          {meta && <div className="stat-meta">{meta}</div>}
        </div>
        <div className={`stat-icon ${iconVariant}`}>
          {IconComp && <IconComp />}
        </div>
      </div>
    </div>
  );
}
