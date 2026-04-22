import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export default function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  const base = "px-4 py-2 rounded-md font-medium focus:outline-none";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50";
  return (
    <button {...rest} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
