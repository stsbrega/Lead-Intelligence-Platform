interface ScoreBarProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function ScoreBar({ score, size = "md", showLabel = true }: ScoreBarProps) {
  const height = size === "sm" ? "h-1.5" : size === "md" ? "h-2" : "h-3";
  const color = score >= 80
    ? "bg-ws-green"
    : score >= 60
    ? "bg-ws-orange"
    : score >= 40
    ? "bg-ws-yellow"
    : "bg-gray-30";

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${height} rounded-full bg-gray-10 overflow-hidden`}>
        <div
          className={`${height} rounded-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-sm font-semibold min-w-[32px] text-right ${
          score >= 80 ? "text-ws-green" : score >= 60 ? "text-ws-orange" : "text-gray-50"
        }`}>
          {score}
        </span>
      )}
    </div>
  );
}
