import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string };

export default function Input(props: Props) {
  return (
    <div className="w-full">
      {props.label && <label className="block text-sm font-medium mb-1">{props.label}</label>}
      <input
        {...props}
        className={`w-full px-4 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${props.className || ""}`}
      />
    </div>
  );
}
