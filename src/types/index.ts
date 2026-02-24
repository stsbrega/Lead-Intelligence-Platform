// === Client / Lead ===
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  city: string;
  province: string;
  occupation: string;
  annualIncome: number;
  accountOpenDate: string;
  totalBalance: number;
  directDepositActive: boolean;
}

export interface Transaction {
  id: string;
  clientId: string;
  date: string;
  amount: number; // negative = outflow, positive = inflow
  description: string;
  category: TransactionCategory;
  merchantName: string;
  isRecurring: boolean;
  type: "debit" | "credit" | "pad" | "eft" | "e-transfer" | "direct-deposit";
}

export type TransactionCategory =
  | "investment_competitor"
  | "rrsp_contribution"
  | "tfsa_contribution"
  | "mortgage_payment"
  | "insurance_premium"
  | "salary_deposit"
  | "government_deposit"
  | "large_transfer"
  | "loan_payment"
  | "subscription"
  | "groceries"
  | "dining"
  | "transportation"
  | "utilities"
  | "rent"
  | "healthcare"
  | "entertainment"
  | "shopping"
  | "other";

// === AI Analysis ===
export interface LeadSignal {
  type: SignalType;
  description: string;
  severity: "high" | "medium" | "low";
  relatedTransactionIds: string[];
  estimatedValue: number;
}

export type SignalType =
  | "competitor_rrsp"
  | "competitor_tfsa"
  | "competitor_investment"
  | "competitor_insurance"
  | "mortgage_refinance"
  | "income_change"
  | "large_balance_idle"
  | "life_event"
  | "spending_pattern"
  | "loan_ending";

export interface AIAnalysis {
  id: string;
  clientId: string;
  score: number; // 0-100
  confidence: "high" | "medium" | "low";
  signals: LeadSignal[];
  summary: string;
  detailedReasoning: string;
  recommendedActions: AdvisorAction[];
  humanDecisionRequired: string;
  analyzedAt: string;
  modelUsed: string;
}

export interface AdvisorAction {
  priority: number;
  action: string;
  rationale: string;
  estimatedImpact: string;
  requiresHumanApproval: boolean;
}

// === Dashboard ===
export interface DashboardMetrics {
  totalLeads: number;
  highPriorityLeads: number;
  avgScore: number;
  totalOpportunityValue: number;
  scoreDistribution: { range: string; count: number }[];
  topSignalTypes: { type: string; count: number }[];
}

// === Lead List View ===
export interface LeadSummary {
  client: Client;
  score: number;
  confidence: string;
  topSignal: string;
  estimatedOpportunity: number;
  status: LeadStatus;
  analyzedAt: string;
}

export type LeadStatus = "new" | "reviewed" | "contacted" | "converted" | "dismissed";
