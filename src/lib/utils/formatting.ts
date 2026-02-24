export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-ws-green";
  if (score >= 60) return "text-ws-orange";
  return "text-gray-50";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-ws-green-light";
  if (score >= 60) return "bg-ws-orange-light";
  return "bg-gray-05";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "High Priority";
  if (score >= 60) return "Medium Priority";
  if (score >= 40) return "Emerging";
  return "Low Priority";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "new": return "bg-ws-green-light text-ws-green-dark";
    case "reviewed": return "bg-ws-yellow-light text-dune";
    case "contacted": return "bg-ws-orange-light text-ws-orange";
    case "converted": return "bg-ws-green-light text-ws-green-dark";
    case "dismissed": return "bg-gray-05 text-gray-50";
    default: return "bg-gray-05 text-gray-50";
  }
}

export function getSignalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    competitor_rrsp: "Competitor RRSP",
    competitor_tfsa: "Competitor TFSA",
    competitor_investment: "Competitor Investment",
    competitor_insurance: "Competitor Insurance",
    mortgage_refinance: "Mortgage Opportunity",
    income_change: "Income Change",
    large_balance_idle: "Idle Balance",
    life_event: "Life Event",
    spending_pattern: "Spending Pattern",
    loan_ending: "Loan Ending",
  };
  return labels[type] || type;
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "high": return "border-l-ws-red bg-ws-red-light";
    case "medium": return "border-l-ws-orange bg-ws-orange-light";
    case "low": return "border-l-ws-green bg-ws-green-light";
    default: return "border-l-gray-30 bg-gray-05";
  }
}
