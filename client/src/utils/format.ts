export function formatEmail(email?: string): string {
  if (!email) return "â\u0080\u0094";
  return email;
}

export function formatLinkedIn(url?: string): string {
  if (!url) return "â\u0080\u0094";
  return url;
}

export function formatScore(score?: number): string {
  if (typeof score !== "number") return "â\u0080\u0094";
  return score.toString();
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount);
}