import React from "react";
import { Loader2 } from "lucide-react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
};

export default function Button({ variant = "primary", className = "", children, disabled, loading, ...rest }: Props) {
  const base = "font-medium focus:outline-none focus-ring disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";
  
  const variantStyles = {
    primary: "btn-primary",
    secondary: "btn-secondary", 
    danger: "btn-danger",
    ghost: "btn-ghost"
  };
  
  return (
    <button 
      {...(rest as any)} 
      disabled={disabled || loading} 
      className={`${base} ${variantStyles[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
