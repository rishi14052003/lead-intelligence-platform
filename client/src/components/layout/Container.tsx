import React from "react";

export default function Container({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 py-16 px-4">{children}</div>;
}
