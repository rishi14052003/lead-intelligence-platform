import { Loader2 } from "lucide-react";

export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <Loader2 
        style={{ width: size, height: size }}
        className="animate-spin text-indigo-600"
      />
    </div>
  );
}
