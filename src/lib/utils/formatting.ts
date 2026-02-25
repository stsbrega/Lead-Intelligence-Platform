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
    case "new": return "bg-gray-05 text-gray-50";
    case "approved": return "bg-ws-green-light text-ws-green-dark";
    case "rejected": return "bg-ws-red-light text-ws-red";
    case "needs_review": return "bg-ws-orange-light text-ws-orange";
    default: return "bg-gray-05 text-gray-50";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "new": return "New";
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    case "needs_review": return "Needs Review";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
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

// === Qualification Tier Helpers ===

export function getTierBadgeColor(tier: string): string {
  switch (tier) {
    case "A": return "bg-ws-green-light text-ws-green-dark";
    case "B": return "bg-ws-orange-light text-ws-orange";
    case "C": return "bg-ws-yellow-light text-dune";
    case "D": return "bg-gray-05 text-gray-50";
    default: return "bg-gray-05 text-gray-50";
  }
}

export function getTierScoreColor(tier: string): string {
  switch (tier) {
    case "A": return "text-ws-green";
    case "B": return "text-ws-orange";
    case "C": return "text-dune";
    case "D": return "text-gray-50";
    default: return "text-gray-50";
  }
}

export function getComplianceStatusColor(status: string): string {
  switch (status) {
    case "pass": return "bg-ws-green-light text-ws-green-dark";
    case "hold_for_review": return "bg-ws-orange-light text-ws-orange";
    case "disqualified": return "bg-ws-red-light text-ws-red";
    default: return "bg-gray-05 text-gray-50";
  }
}

export function getComplianceStatusLabel(status: string): string {
  switch (status) {
    case "pass": return "Pass";
    case "hold_for_review": return "Hold for Review";
    case "disqualified": return "Disqualified";
    default: return status;
  }
}

export function getVerticalLabel(vertical: string): string {
  const labels: Record<string, string> = {
    retail_banking: "Retail Banking",
    commercial_banking: "Commercial Banking",
    mortgage_lending: "Mortgage Lending",
    wealth_management: "Wealth Management",
  };
  return labels[vertical] || vertical;
}

export function getDimensionLabel(dimension: string): string {
  const labels: Record<string, string> = {
    demographic_fit: "Demographic Fit",
    financial_qualification: "Financial Qualification",
    behavioral_engagement: "Behavioral Engagement",
    intent_signals: "Intent Signals",
    compliance_readiness: "Compliance Readiness",
  };
  return labels[dimension] || dimension;
}

export function getDimensionColor(dimension: string): string {
  const colors: Record<string, string> = {
    demographic_fit: "bg-blue-500",
    financial_qualification: "bg-ws-green",
    behavioral_engagement: "bg-ws-orange",
    intent_signals: "bg-purple-500",
    compliance_readiness: "bg-teal-500",
  };
  return colors[dimension] || "bg-gray-30";
}

export function getDimensionBarColor(dimension: string): string {
  const colors: Record<string, string> = {
    demographic_fit: "bg-blue-100",
    financial_qualification: "bg-ws-green-light",
    behavioral_engagement: "bg-ws-orange-light",
    intent_signals: "bg-purple-100",
    compliance_readiness: "bg-teal-100",
  };
  return colors[dimension] || "bg-gray-05";
}
