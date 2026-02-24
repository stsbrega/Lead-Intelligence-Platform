import Card from "./Card";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  accent?: "green" | "orange" | "default";
}

export default function MetricCard({ label, value, subtitle, accent = "default" }: MetricCardProps) {
  const accentColor = accent === "green"
    ? "text-ws-green"
    : accent === "orange"
    ? "text-ws-orange"
    : "text-dune";

  return (
    <Card className="p-5 min-w-0">
      <p className="text-sm text-gray-50 font-medium truncate">{label}</p>
      <p className={`font-[family-name:var(--font-display)] text-2xl font-bold mt-1 truncate ${accentColor}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-30 mt-1">{subtitle}</p>
      )}
    </Card>
  );
}
