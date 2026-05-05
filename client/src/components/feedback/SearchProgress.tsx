import { useEffect } from "react";
import ReactDOM from "react-dom";

interface SearchProgressProps {
  companyName?: string;
}

export default function SearchProgress({ companyName = "your company" }: SearchProgressProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return ReactDOM.createPortal(
    <>
      {/* Blurred backdrop — covers full viewport including sidebar */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          backgroundColor: "rgba(0, 0, 0, 0.45)",
        }}
      />

      {/* Spinner + text — centered on full viewport */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          pointerEvents: "none",
        }}
      >
        <div style={{ width: 80, height: 80 }}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
            <defs>
              <linearGradient id="spin-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#spin-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              style={{
                strokeDasharray: "282.7",
                strokeDashoffset: "70.7",
                animation: "loader-spin 1.4s linear infinite",
                transformOrigin: "50% 50%",
              }}
            />
          </svg>
        </div>

        <p style={{ color: "#fff", fontSize: 18, fontWeight: 500, margin: 0, textAlign: "center" }}>
          Fetching data for{" "}
          <span style={{ color: "#f97316", fontWeight: 700 }}>{companyName}</span>
        </p>
      </div>

      <style>{`
        @keyframes loader-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>,
    document.body
  );
}