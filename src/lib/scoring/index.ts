// Lead Qualification Scoring Module
// Barrel export for clean imports

export { scoreLeadQualification, calculateDecayedScore, inferVertical } from "./scorer";
export { computeQualificationScore, computeAllQualificationScores } from "./compute";

export {
  VERTICAL_WEIGHTS,
  TIER_THRESHOLDS,
  COMPLIANCE_GATE_MINIMUM,
  DEMOGRAPHIC_CRITERIA,
  FINANCIAL_CRITERIA,
  COMPLIANCE_CRITERIA,
  BEHAVIORAL_SIGNALS,
  INTENT_SIGNALS,
  NEGATIVE_SIGNALS,
  getTierLabel,
  getTierColor,
  getTierBgColor,
  getDimensionLabel,
  getComplianceGateLabel,
  getComplianceGateColor,
} from "./config";

export type {
  BankingVertical,
  ScoringDimension,
  QualificationTier,
  ComplianceGateStatus,
  DimensionScore,
  CriterionResult,
  NegativeAdjustment,
  LeadQualificationScore,
  LeadEnrichmentData,
  DecayableSignal,
  VerticalWeights,
  TierThreshold,
} from "./types";
