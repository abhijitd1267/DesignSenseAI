interface SentimentBadgeProps {
  sentiment: "Positive" | "Neutral" | "Negative" | string;
  label?: string;
}

const colors: Record<string, string> = {
  Positive: "bg-emerald-100 text-emerald-600",
  Neutral: "bg-slate-100 text-slate-600",
  Negative: "bg-rose-100 text-rose-600",
};

export function SentimentBadge({ sentiment, label }: SentimentBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colors[sentiment] ?? "bg-slate-100 text-slate-600"}`}>
      {label ?? sentiment}
    </span>
  );
}
