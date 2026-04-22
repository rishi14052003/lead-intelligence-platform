import { Loader2 } from "lucide-react";

export default function Loader({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12"
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`animate-spin text-indigo-600 ${sizeClasses[size]}`} />
    </div>
  );
}
