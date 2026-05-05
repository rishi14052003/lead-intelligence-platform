export default function SearchProgress() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-[9999]">
      <div className="bg-white/98 backdrop-blur-md rounded-3xl shadow-2xl p-16 max-w-md w-full mx-4">
        {/* Circular Progress Track */}
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16">
            {/* Background circle */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Animated progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                className="animate-spin"
                style={{
                  strokeDasharray: "282.7",
                  strokeDashoffset: "70.7",
                  animation: "spin 2s linear infinite",
                  transformOrigin: "50% 50%",
                }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-700">...</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-center text-xl font-semibold text-gray-900 mb-2">
          Searching
        </h3>
        
        {/* Message */}
        <p className="text-center text-sm text-gray-600 mb-6">
          Scanning websites, LinkedIn, and public data
        </p>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center mt-0.5 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Scraping websites</p>
              <p className="text-xs text-gray-500">Analyzing company pages</p>
            </div>
          </div>
        </div>

        {/* Estimate */}
        <p className="text-xs text-gray-500 text-center">
          ⏱️ This usually takes 30-60 seconds
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
