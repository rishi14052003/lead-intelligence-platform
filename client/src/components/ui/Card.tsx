interface CardProps {
  title?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export default function Card({ title, extra, children, style, className = "" }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
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
