import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { 
  label?: string;
  error?: string;
  helperText?: string;
};

export default function Input({ label, error, helperText, className = "", ...props }: Props) {
  const baseClasses = "w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";
  const errorClasses = error ? "border-red-300 focus:ring-red-500" : "border-gray-200";
  const inputClasses = `${baseClasses} ${errorClasses} ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        {...props}
        className={inputClasses}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
      />
      {error && (
        <p id={`${props.id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${props.id}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
