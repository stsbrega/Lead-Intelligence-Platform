import type {
  BankingVertical,
  VerticalWeights,
  TierThreshold,
  ScoringDimension,
} from "./types";

// === Vertical-Specific Dimension Weights ===
// Each vertical weights the five dimensions differently based on conversion drivers.
// All weights for a vertical must sum to 1.0.

export const VERTICAL_WEIGHTS: Record<BankingVertical, VerticalWeights> = {
  retail_banking: {
    demographic_fit: 0.20,
    financial_qualification: 0.15,
    behavioral_engagement: 0.30,
    intent_signals: 0.25,
    compliance_readiness: 0.10,
  },
  commercial_banking: {
    demographic_fit: 0.15,
    financial_qualification: 0.25,
    behavioral_engagement: 0.20,
    intent_signals: 0.25,
    compliance_readiness: 0.15,
  },
  mortgage_lending: {
    demographic_fit: 0.15,
    financial_qualification: 0.30,
    behavioral_engagement: 0.20,
    intent_signals: 0.25,
    compliance_readiness: 0.10,
  },
  wealth_management: {
    demographic_fit: 0.20,
    financial_qualification: 0.25,
    behavioral_engagement: 0.15,
    intent_signals: 0.20,
    compliance_readiness: 0.20,
  },
};

// === Tier Thresholds ===

export const TIER_THRESHOLDS: TierThreshold[] = [
  { tier: "A", minScore: 80, maxScore: 100, label: "Sales-Ready", routingAction: "Route to senior advisor within 4 hours" },
  { tier: "B", minScore: 60, maxScore: 79, label: "Sales-Qualified", routingAction: "Sales follow-up within 24-48 hours" },
  { tier: "C", minScore: 40, maxScore: 59, label: "Marketing-Qualified", routingAction: "Automated nurture; monthly re-evaluation" },
  { tier: "D", minScore: 0, maxScore: 39, label: "Unqualified", routingAction: "Archive or long-term drip only" },
];

// Leads with compliance sub-score below this are held regardless of composite
export const COMPLIANCE_GATE_MINIMUM = 40;

// === Demographic Fit Criteria (max 100 points per vertical) ===

export interface CriterionConfig {
  name: string;
  maxPoints: number;
}

export const DEMOGRAPHIC_CRITERIA: Record<BankingVertical, CriterionConfig[]> = {
  retail_banking: [
    { name: "age_prime_banking", maxPoints: 20 },
    { name: "within_service_footprint", maxPoints: 15 },
    { name: "household_income_50k_plus", maxPoints: 25 },
    { name: "employment_stability_2yr", maxPoints: 20 },
    { name: "credit_score_650_plus", maxPoints: 20 },
  ],
  commercial_banking: [
    { name: "business_revenue_250k_plus", maxPoints: 25 },
    { name: "business_operating_2yr", maxPoints: 20 },
    { name: "within_service_geography", maxPoints: 15 },
    { name: "industry_not_restricted", maxPoints: 15 },
    { name: "decision_maker_access", maxPoints: 25 },
  ],
  mortgage_lending: [
    { name: "age_prime_homebuying", maxPoints: 15 },
    { name: "within_lending_geography", maxPoints: 15 },
    { name: "income_supports_target", maxPoints: 25 },
    { name: "employment_stability_2yr", maxPoints: 25 },
    { name: "buyer_status_identified", maxPoints: 20 },
  ],
  wealth_management: [
    { name: "age_wealth_accumulation", maxPoints: 15 },
    { name: "income_200k_plus", maxPoints: 20 },
    { name: "high_earning_professional", maxPoints: 15 },
    { name: "investable_assets_1m_plus", maxPoints: 30 },
    { name: "hnw_corridor_location", maxPoints: 20 },
  ],
};

// === Financial Qualification Criteria ===

export const FINANCIAL_CRITERIA: Record<BankingVertical, CriterionConfig[]> = {
  retail_banking: [
    { name: "dti_below_36_pct", maxPoints: 25 },
    { name: "positive_savings_pattern", maxPoints: 20 },
    { name: "no_recent_defaults", maxPoints: 25 },
    { name: "existing_relationship", maxPoints: 15 },
    { name: "multi_product_potential", maxPoints: 15 },
  ],
  commercial_banking: [
    { name: "business_credit_670_plus", maxPoints: 20 },
    { name: "positive_operating_cashflow", maxPoints: 25 },
    { name: "adequate_collateral", maxPoints: 20 },
    { name: "personal_credit_680_plus", maxPoints: 15 },
    { name: "clear_use_of_funds", maxPoints: 10 },
    { name: "no_excessive_debt", maxPoints: 10 },
  ],
  mortgage_lending: [
    { name: "credit_score_680_plus", maxPoints: 25 },
    { name: "dti_below_43_pct", maxPoints: 25 },
    { name: "down_payment_20_pct", maxPoints: 20 },
    { name: "stable_income_trend", maxPoints: 15 },
    { name: "no_recent_foreclosures", maxPoints: 15 },
  ],
  wealth_management: [
    { name: "accredited_investor", maxPoints: 25 },
    { name: "investable_assets_above_minimum", maxPoints: 25 },
    { name: "complex_financial_needs", maxPoints: 20 },
    { name: "advisor_relationship_ending", maxPoints: 15 },
    { name: "multi_generational_planning", maxPoints: 15 },
  ],
};

// === Behavioral Engagement Point Values ===

export const BEHAVIORAL_SIGNALS: Record<string, { points: number; halfLifeDays: number }> = {
  product_page_visit: { points: 10, halfLifeDays: 30 },
  content_download: { points: 15, halfLifeDays: 45 },
  webinar_attendance: { points: 20, halfLifeDays: 60 },
  email_open: { points: 3, halfLifeDays: 14 },
  email_click: { points: 8, halfLifeDays: 21 },
  form_submission: { points: 25, halfLifeDays: 30 },
  branch_visit: { points: 30, halfLifeDays: 45 },
  chat_engagement: { points: 12, halfLifeDays: 21 },
  return_visits_7d: { points: 15, halfLifeDays: 14 },
  customer_referral: { points: 35, halfLifeDays: 0 }, // no decay
};

// === Intent Signal Point Values ===

export const INTENT_SIGNALS: Record<string, { points: number; halfLifeDays: number }> = {
  application_started: { points: 30, halfLifeDays: 30 },
  rate_comparison: { points: 20, halfLifeDays: 21 },
  pre_approval_requested: { points: 30, halfLifeDays: 45 },
  life_event_trigger: { points: 20, halfLifeDays: 60 },
  competitor_mentioned: { points: 15, halfLifeDays: 30 },
  urgency_expressed: { points: 18, halfLifeDays: 21 },
  consultation_requested: { points: 25, halfLifeDays: 30 },
  multiple_product_pages_7d: { points: 18, halfLifeDays: 14 },
};

// === Negative Scoring ===

export const NEGATIVE_SIGNALS: Record<string, { points: number; reason: string }> = {
  email_unsubscribe: { points: -15, reason: "Lead opted out of communication" },
  email_bounced: { points: -20, reason: "Invalid email — poor data quality" },
  competitor_employee: { points: -40, reason: "Competitive intelligence, not genuine prospect" },
  suspicious_submission: { points: -50, reason: "Fraudulent or automated lead" },
  disposable_email: { points: -30, reason: "Disposable email domain — low seriousness" },
  job_seeker: { points: -20, reason: "Interest in employment, not banking products" },
  no_engagement_90d: { points: -15, reason: "No engagement in 90+ days" },
  sanctions_flag: { points: -100, reason: "Sanctions or adverse media — auto-disqualify" },
};

// === Compliance Readiness Criteria ===

export const COMPLIANCE_CRITERIA: Record<BankingVertical, CriterionConfig[]> = {
  retail_banking: [
    { name: "identity_verified", maxPoints: 40 },
    { name: "no_sanctions_pep", maxPoints: 30 },
    { name: "adverse_media_clear", maxPoints: 20 },
    { name: "low_risk_jurisdiction", maxPoints: 10 },
  ],
  commercial_banking: [
    { name: "business_identity_verified", maxPoints: 30 },
    { name: "beneficial_ownership_documented", maxPoints: 25 },
    { name: "no_sanctions_pep_adverse", maxPoints: 25 },
    { name: "source_of_funds_documented", maxPoints: 10 },
    { name: "low_risk_industry_jurisdiction", maxPoints: 10 },
  ],
  mortgage_lending: [
    { name: "identity_income_verified", maxPoints: 35 },
    { name: "employment_verified", maxPoints: 25 },
    { name: "no_sanctions_fraud", maxPoints: 25 },
    { name: "property_eligibility", maxPoints: 15 },
  ],
  wealth_management: [
    { name: "identity_verified_edd", maxPoints: 25 },
    { name: "source_of_wealth_documented", maxPoints: 25 },
    { name: "pep_screening_complete", maxPoints: 20 },
    { name: "no_sanctions_adverse", maxPoints: 20 },
    { name: "accredited_status_confirmed", maxPoints: 10 },
  ],
};

// === Score Label & Color Helpers ===

export function getTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    A: "Sales-Ready",
    B: "Sales-Qualified",
    C: "Marketing-Qualified",
    D: "Unqualified",
  };
  return labels[tier] || tier;
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case "A": return "text-ws-green";
    case "B": return "text-ws-orange";
    case "C": return "text-gray-50";
    case "D": return "text-ws-red";
    default: return "text-gray-50";
  }
}

export function getTierBgColor(tier: string): string {
  switch (tier) {
    case "A": return "bg-ws-green-light";
    case "B": return "bg-ws-orange-light";
    case "C": return "bg-gray-05";
    case "D": return "bg-ws-red-light";
    default: return "bg-gray-05";
  }
}

export function getDimensionLabel(dimension: ScoringDimension): string {
  const labels: Record<ScoringDimension, string> = {
    demographic_fit: "Demographic Fit",
    financial_qualification: "Financial Qualification",
    behavioral_engagement: "Behavioral Engagement",
    intent_signals: "Intent Signals",
    compliance_readiness: "Compliance Readiness",
  };
  return labels[dimension];
}

export function getComplianceGateLabel(status: string): string {
  switch (status) {
    case "pass": return "Pass";
    case "hold_for_review": return "Hold for Review";
    case "disqualified": return "Disqualified";
    default: return status;
  }
}

export function getComplianceGateColor(status: string): string {
  switch (status) {
    case "pass": return "text-ws-green";
    case "hold_for_review": return "text-ws-orange";
    case "disqualified": return "text-ws-red";
    default: return "text-gray-50";
  }
}
