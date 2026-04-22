import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorState({ title, subtitle, onRetry }: { 
  title: string; 
  subtitle?: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
        <AlertCircle className="w-6 h-6 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center mx-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  );
}
