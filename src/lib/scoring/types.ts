// === Lead Qualification Scoring Types ===

export type BankingVertical =
  | "retail_banking"
  | "commercial_banking"
  | "mortgage_lending"
  | "wealth_management";

export type ScoringDimension =
  | "demographic_fit"
  | "financial_qualification"
  | "behavioral_engagement"
  | "intent_signals"
  | "compliance_readiness";

export type QualificationTier = "A" | "B" | "C" | "D";

export type ComplianceGateStatus = "pass" | "hold_for_review" | "disqualified";

// === Sub-Score Breakdown ===

export interface DimensionScore {
  dimension: ScoringDimension;
  rawScore: number; // 0-100
  weight: number; // 0-1
  weightedScore: number; // rawScore * weight
  criteriaResults: CriterionResult[];
}

export interface CriterionResult {
  name: string;
  maxPoints: number;
  awardedPoints: number;
  reason: string;
}

// === Composite Score Output ===

export interface LeadQualificationScore {
  clientId: string;
  vertical: BankingVertical;
  compositeScore: number; // 0-100
  tier: QualificationTier;
  tierLabel: string;
  complianceGate: ComplianceGateStatus;
  dimensions: DimensionScore[];
  negativeAdjustments: NegativeAdjustment[];
  totalNegativePoints: number;
  scoredAt: string;
}

export interface NegativeAdjustment {
  signal: string;
  points: number; // always negative
  reason: string;
}

// === Decay Tracking ===

export interface DecayableSignal {
  signalType: string;
  initialPoints: number;
  halfLifeDays: number; // 0 = no decay
  occurredAt: string; // ISO date
}

// === Enrichment Input (optional data beyond Client + Transaction) ===

export interface LeadEnrichmentData {
  // Behavioral engagement (from web analytics / CRM)
  productPageVisits?: number;
  contentDownloads?: number;
  emailOpens?: number;
  emailClicks?: number;
  formSubmissions?: number;
  branchVisits?: number;
  chatEngagements?: number;
  returnVisitsLast7Days?: number;
  webinarAttendance?: number;
  referredByExistingClient?: boolean;

  // Intent signals (from CRM / advisor input)
  applicationStarted?: boolean;
  rateComparisonDetected?: boolean;
  preApprovalRequested?: boolean;
  lifeEventDetected?: boolean;
  lifeEventDescription?: string;
  competitorMentioned?: boolean;
  urgencyExpressed?: boolean;
  consultationRequested?: boolean;

  // Compliance (from KYC / screening systems)
  identityVerified?: boolean;
  pepScreeningComplete?: boolean;
  pepFlagged?: boolean;
  sanctionsScreeningClear?: boolean;
  adverseMediaClear?: boolean;
  sourceOfFundsDocumented?: boolean;
  jurisdictionRiskLevel?: "low" | "medium" | "high";

  // Financial extras (from credit bureau / enrichment)
  creditScore?: number;
  dtiRatio?: number; // 0-1
  investableAssets?: number;
  downPaymentCapacity?: number;
  businessRevenue?: number;
  businessOperatingYears?: number;
  employmentYears?: number;
  accreditedInvestor?: boolean;
  existingRelationshipMonths?: number;

  // Negative signals
  emailBounced?: boolean;
  emailUnsubscribed?: boolean;
  competitorEmployee?: boolean;
  suspiciousSubmission?: boolean;
  disposableEmail?: boolean;
  daysSinceLastEngagement?: number;
  jobSeekerBehavior?: boolean;
}

// === Weight Configuration ===

export interface VerticalWeights {
  demographic_fit: number;
  financial_qualification: number;
  behavioral_engagement: number;
  intent_signals: number;
  compliance_readiness: number;
}

export interface TierThreshold {
  tier: QualificationTier;
  minScore: number;
  maxScore: number;
  label: string;
  routingAction: string;
}
