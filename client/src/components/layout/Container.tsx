import React from "react";

export default function Container({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen py-8 px-6 ml-56" style={{ background: 'var(--gradient-bg)' }}>{children}</div>;
}
