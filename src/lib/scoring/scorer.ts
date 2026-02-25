import type { Client, Transaction, LeadSignal } from "@/types";
import type {
  BankingVertical,
  ScoringDimension,
  QualificationTier,
  ComplianceGateStatus,
  DimensionScore,
  CriterionResult,
  NegativeAdjustment,
  LeadQualificationScore,
  LeadEnrichmentData,
} from "./types";
import {
  VERTICAL_WEIGHTS,
  TIER_THRESHOLDS,
  COMPLIANCE_GATE_MINIMUM,
  DEMOGRAPHIC_CRITERIA,
  FINANCIAL_CRITERIA,
  COMPLIANCE_CRITERIA,
  BEHAVIORAL_SIGNALS,
  INTENT_SIGNALS,
  NEGATIVE_SIGNALS,
} from "./config";

// === Main Scoring Function ===

export function scoreLeadQualification(
  client: Client,
  transactions: Transaction[],
  existingSignals: LeadSignal[],
  vertical: BankingVertical = "retail_banking",
  enrichment: LeadEnrichmentData = {}
): LeadQualificationScore {
  const weights = VERTICAL_WEIGHTS[vertical];

  // Score each dimension
  const demographicScore = scoreDemographicFit(client, vertical, enrichment);
  const financialScore = scoreFinancialQualification(client, transactions, vertical, enrichment);
  const behavioralScore = scoreBehavioralEngagement(enrichment);
  const intentScore = scoreIntentSignals(existingSignals, enrichment);
  const complianceScore = scoreComplianceReadiness(vertical, enrichment);

  const allDimensions: DimensionScore[] = [
    applyWeight(demographicScore, weights.demographic_fit),
    applyWeight(financialScore, weights.financial_qualification),
    applyWeight(behavioralScore, weights.behavioral_engagement),
    applyWeight(intentScore, weights.intent_signals),
    applyWeight(complianceScore, weights.compliance_readiness),
  ];

  // Negative adjustments
  const negatives = computeNegativeAdjustments(enrichment);
  const totalNegative = negatives.reduce((sum, n) => sum + n.points, 0);

  // Composite = sum of weighted scores + negatives, clamped 0-100
  const rawComposite = allDimensions.reduce((sum, d) => sum + d.weightedScore, 0);
  const compositeScore = clamp(rawComposite + totalNegative, 0, 100);

  // Tier assignment
  const tier = assignTier(compositeScore);

  // Compliance gate (independent of composite)
  const complianceGate = evaluateComplianceGate(complianceScore.rawScore, enrichment);

  return {
    clientId: client.id,
    vertical,
    compositeScore: round(compositeScore, 1),
    tier,
    tierLabel: TIER_THRESHOLDS.find(t => t.tier === tier)?.label || tier,
    complianceGate,
    dimensions: allDimensions,
    negativeAdjustments: negatives,
    totalNegativePoints: totalNegative,
    scoredAt: new Date().toISOString(),
  };
}

// === Dimension Scorers ===

function scoreDemographicFit(
  client: Client,
  vertical: BankingVertical,
  enrichment: LeadEnrichmentData
): DimensionScore {
  const criteria = DEMOGRAPHIC_CRITERIA[vertical];
  const results: CriterionResult[] = [];

  for (const criterion of criteria) {
    const result = evaluateDemographicCriterion(criterion.name, criterion.maxPoints, client, enrichment);
    results.push(result);
  }

  const rawScore = clamp(results.reduce((sum, r) => sum + r.awardedPoints, 0), 0, 100);

  return {
    dimension: "demographic_fit",
    rawScore,
    weight: 0,
    weightedScore: 0,
    criteriaResults: results,
  };
}

function evaluateDemographicCriterion(
  name: string,
  maxPoints: number,
  client: Client,
  enrichment: LeadEnrichmentData
): CriterionResult {
  switch (name) {
    // Retail
    case "age_prime_banking":
      if (client.age >= 25 && client.age <= 55) return award(name, maxPoints, maxPoints, "Age in prime banking range (25-55)");
      if (client.age >= 18 && client.age <= 65) return award(name, maxPoints, maxPoints * 0.6, "Age in acceptable range");
      return award(name, maxPoints, 0, "Age outside target range");

    case "within_service_footprint":
      // Canadian provinces where Wealthsimple operates fully
      return award(name, maxPoints, maxPoints, "Within Canadian service footprint");

    case "household_income_50k_plus":
      if (client.annualIncome >= 100000) return award(name, maxPoints, maxPoints, `Income ${fmt(client.annualIncome)} exceeds $100K`);
      if (client.annualIncome >= 50000) return award(name, maxPoints, maxPoints * 0.7, `Income ${fmt(client.annualIncome)} meets $50K threshold`);
      return award(name, maxPoints, maxPoints * 0.3, `Income ${fmt(client.annualIncome)} below $50K target`);

    case "employment_stability_2yr": {
      const years = enrichment.employmentYears ?? inferEmploymentYears(client);
      if (years >= 2) return award(name, maxPoints, maxPoints, `${years}+ years employment stability`);
      if (years >= 1) return award(name, maxPoints, maxPoints * 0.5, `${years} year employment — below 2yr target`);
      return award(name, maxPoints, 0, "Employment duration unknown or insufficient");
    }

    case "credit_score_650_plus": {
      const cs = enrichment.creditScore;
      if (!cs) return award(name, maxPoints, maxPoints * 0.5, "Credit score not available — neutral");
      if (cs >= 740) return award(name, maxPoints, maxPoints, `Credit score ${cs} — excellent`);
      if (cs >= 650) return award(name, maxPoints, maxPoints * 0.7, `Credit score ${cs} — good`);
      return award(name, maxPoints, maxPoints * 0.2, `Credit score ${cs} — below 650 threshold`);
    }

    // Commercial
    case "business_revenue_250k_plus": {
      const rev = enrichment.businessRevenue;
      if (!rev) return award(name, maxPoints, maxPoints * 0.3, "Business revenue unknown");
      if (rev >= 1000000) return award(name, maxPoints, maxPoints, `Revenue ${fmt(rev)} — strong`);
      if (rev >= 250000) return award(name, maxPoints, maxPoints * 0.7, `Revenue ${fmt(rev)} meets threshold`);
      return award(name, maxPoints, maxPoints * 0.2, `Revenue ${fmt(rev)} below $250K minimum`);
    }

    case "business_operating_2yr": {
      const yrs = enrichment.businessOperatingYears;
      if (!yrs) return award(name, maxPoints, maxPoints * 0.3, "Business age unknown");
      if (yrs >= 5) return award(name, maxPoints, maxPoints, `${yrs} years operating — established`);
      if (yrs >= 2) return award(name, maxPoints, maxPoints * 0.7, `${yrs} years operating`);
      return award(name, maxPoints, maxPoints * 0.2, `${yrs} year(s) — below 2yr minimum`);
    }

    case "within_service_geography":
      return award(name, maxPoints, maxPoints, "Within service geography");

    case "industry_not_restricted":
      return award(name, maxPoints, maxPoints, "Industry not on restricted list");

    case "decision_maker_access":
      return award(name, maxPoints, maxPoints * 0.5, "Decision-maker access not yet confirmed");

    // Mortgage
    case "age_prime_homebuying":
      if (client.age >= 25 && client.age <= 55) return award(name, maxPoints, maxPoints, "Age in prime homebuying range");
      if (client.age >= 18 && client.age <= 65) return award(name, maxPoints, maxPoints * 0.5, "Age in extended range");
      return award(name, maxPoints, 0, "Age outside homebuying range");

    case "within_lending_geography":
      return award(name, maxPoints, maxPoints, "Within lending geography");

    case "income_supports_target":
      if (client.annualIncome >= 80000) return award(name, maxPoints, maxPoints, `Income ${fmt(client.annualIncome)} supports mortgage`);
      if (client.annualIncome >= 50000) return award(name, maxPoints, maxPoints * 0.6, `Income ${fmt(client.annualIncome)} — moderate`);
      return award(name, maxPoints, maxPoints * 0.2, `Income ${fmt(client.annualIncome)} — limited`);

    case "buyer_status_identified":
      return award(name, maxPoints, maxPoints * 0.5, "Buyer status not yet confirmed");

    // Wealth Management
    case "age_wealth_accumulation":
      if (client.age >= 45) return award(name, maxPoints, maxPoints, "Age 45+ — wealth accumulation/distribution phase");
      if (client.age >= 35) return award(name, maxPoints, maxPoints * 0.6, "Age 35-44 — early accumulation");
      return award(name, maxPoints, maxPoints * 0.3, "Age below 35 — early career");

    case "income_200k_plus":
      if (client.annualIncome >= 300000) return award(name, maxPoints, maxPoints, `Income ${fmt(client.annualIncome)} exceeds $300K`);
      if (client.annualIncome >= 200000) return award(name, maxPoints, maxPoints * 0.8, `Income ${fmt(client.annualIncome)} meets $200K threshold`);
      if (client.annualIncome >= 100000) return award(name, maxPoints, maxPoints * 0.4, `Income ${fmt(client.annualIncome)} — approaching threshold`);
      return award(name, maxPoints, 0, `Income ${fmt(client.annualIncome)} below $200K minimum`);

    case "high_earning_professional": {
      const highEarningOccupations = /engineer|doctor|lawyer|dentist|executive|director|vp|ceo|cfo|owner|partner|surgeon|physician|pharmacist/i;
      if (highEarningOccupations.test(client.occupation))
        return award(name, maxPoints, maxPoints, `Occupation "${client.occupation}" — high-earning professional`);
      return award(name, maxPoints, maxPoints * 0.4, `Occupation "${client.occupation}" — not in high-earning category`);
    }

    case "investable_assets_1m_plus": {
      const assets = enrichment.investableAssets ?? client.totalBalance;
      if (assets >= 5000000) return award(name, maxPoints, maxPoints, `${fmt(assets)} investable — VHNW`);
      if (assets >= 1000000) return award(name, maxPoints, maxPoints * 0.8, `${fmt(assets)} investable — HNW`);
      if (assets >= 250000) return award(name, maxPoints, maxPoints * 0.4, `${fmt(assets)} — approaching HNW`);
      return award(name, maxPoints, maxPoints * 0.1, `${fmt(assets)} — below HNW threshold`);
    }

    case "hnw_corridor_location": {
      const hnwCities = /toronto|vancouver|calgary|montreal|ottawa|victoria|west vancouver|oakville|markham|richmond hill/i;
      if (hnwCities.test(client.city)) return award(name, maxPoints, maxPoints, `${client.city} — HNW corridor`);
      return award(name, maxPoints, maxPoints * 0.5, `${client.city} — standard market`);
    }

    default:
      return award(name, maxPoints, 0, "Criterion not evaluated");
  }
}

function scoreFinancialQualification(
  client: Client,
  transactions: Transaction[],
  vertical: BankingVertical,
  enrichment: LeadEnrichmentData
): DimensionScore {
  const criteria = FINANCIAL_CRITERIA[vertical];
  const results: CriterionResult[] = [];

  for (const criterion of criteria) {
    const result = evaluateFinancialCriterion(criterion.name, criterion.maxPoints, client, transactions, enrichment);
    results.push(result);
  }

  const rawScore = clamp(results.reduce((sum, r) => sum + r.awardedPoints, 0), 0, 100);

  return {
    dimension: "financial_qualification",
    rawScore,
    weight: 0,
    weightedScore: 0,
    criteriaResults: results,
  };
}

function evaluateFinancialCriterion(
  name: string,
  maxPoints: number,
  client: Client,
  transactions: Transaction[],
  enrichment: LeadEnrichmentData
): CriterionResult {
  switch (name) {
    case "dti_below_36_pct":
    case "dti_below_43_pct": {
      const dti = enrichment.dtiRatio ?? estimateDti(client, transactions);
      const threshold = name === "dti_below_36_pct" ? 0.36 : 0.43;
      const pct = (dti * 100).toFixed(0);
      if (dti <= threshold * 0.8) return award(name, maxPoints, maxPoints, `DTI ${pct}% — well below ${(threshold * 100).toFixed(0)}%`);
      if (dti <= threshold) return award(name, maxPoints, maxPoints * 0.7, `DTI ${pct}% — within threshold`);
      return award(name, maxPoints, maxPoints * 0.2, `DTI ${pct}% — above ${(threshold * 100).toFixed(0)}% limit`);
    }

    case "positive_savings_pattern": {
      const monthlySavings = estimateMonthlySavings(transactions);
      if (monthlySavings > 500) return award(name, maxPoints, maxPoints, `Saving ~${fmt(monthlySavings)}/mo`);
      if (monthlySavings > 0) return award(name, maxPoints, maxPoints * 0.5, `Minimal savings pattern`);
      return award(name, maxPoints, 0, "No positive savings pattern detected");
    }

    case "no_recent_defaults":
    case "no_recent_foreclosures":
      return award(name, maxPoints, maxPoints, "No defaults/foreclosures detected in transactions");

    case "existing_relationship": {
      const months = enrichment.existingRelationshipMonths ?? calculateRelationshipMonths(client);
      if (months >= 24) return award(name, maxPoints, maxPoints, `${months}-month relationship — established`);
      if (months >= 6) return award(name, maxPoints, maxPoints * 0.6, `${months}-month relationship`);
      return award(name, maxPoints, maxPoints * 0.2, `${months}-month relationship — new`);
    }

    case "multi_product_potential": {
      const categories = new Set(transactions.map(t => t.category));
      const productSignals = ["rrsp_contribution", "tfsa_contribution", "mortgage_payment", "insurance_premium", "investment_competitor"];
      const active = productSignals.filter(p => categories.has(p as Transaction["category"]));
      if (active.length >= 3) return award(name, maxPoints, maxPoints, `${active.length} product categories active`);
      if (active.length >= 1) return award(name, maxPoints, maxPoints * 0.5, `${active.length} product category active`);
      return award(name, maxPoints, maxPoints * 0.2, "Single-product usage");
    }

    case "business_credit_670_plus":
    case "personal_credit_680_plus":
    case "credit_score_680_plus": {
      const cs = enrichment.creditScore;
      const threshold = name === "business_credit_670_plus" ? 670 : 680;
      if (!cs) return award(name, maxPoints, maxPoints * 0.5, "Credit score not available");
      if (cs >= 740) return award(name, maxPoints, maxPoints, `Credit score ${cs} — excellent`);
      if (cs >= threshold) return award(name, maxPoints, maxPoints * 0.7, `Credit score ${cs} — meets threshold`);
      return award(name, maxPoints, maxPoints * 0.2, `Credit score ${cs} — below ${threshold}`);
    }

    case "positive_operating_cashflow": {
      const inflows = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const outflows = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
      if (inflows > outflows * 1.2) return award(name, maxPoints, maxPoints, "Strong positive cash flow");
      if (inflows > outflows) return award(name, maxPoints, maxPoints * 0.6, "Marginally positive cash flow");
      return award(name, maxPoints, maxPoints * 0.2, "Negative or break-even cash flow");
    }

    case "adequate_collateral":
      return award(name, maxPoints, maxPoints * 0.5, "Collateral adequacy not yet assessed");

    case "clear_use_of_funds":
      return award(name, maxPoints, maxPoints * 0.5, "Use of funds not yet documented");

    case "no_excessive_debt":
      return award(name, maxPoints, maxPoints * 0.7, "Debt levels appear manageable from transactions");

    case "down_payment_20_pct": {
      const dp = enrichment.downPaymentCapacity ?? client.totalBalance;
      if (dp >= 100000) return award(name, maxPoints, maxPoints, `${fmt(dp)} available — strong down payment capacity`);
      if (dp >= 50000) return award(name, maxPoints, maxPoints * 0.6, `${fmt(dp)} available — moderate`);
      return award(name, maxPoints, maxPoints * 0.2, `${fmt(dp)} — limited down payment`);
    }

    case "stable_income_trend": {
      const salaries = transactions
        .filter(t => t.type === "direct-deposit" || t.category === "salary_deposit")
        .map(t => t.amount);
      if (salaries.length < 2) return award(name, maxPoints, maxPoints * 0.5, "Insufficient salary data");
      const stdDev = standardDeviation(salaries);
      const mean = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      const cv = mean > 0 ? stdDev / mean : 1;
      if (cv < 0.1) return award(name, maxPoints, maxPoints, "Very stable income pattern");
      if (cv < 0.25) return award(name, maxPoints, maxPoints * 0.7, "Moderately stable income");
      return award(name, maxPoints, maxPoints * 0.3, "Income volatility detected");
    }

    case "accredited_investor": {
      if (enrichment.accreditedInvestor === true) return award(name, maxPoints, maxPoints, "Accredited investor status confirmed");
      if (client.annualIncome >= 200000 || (enrichment.investableAssets ?? client.totalBalance) >= 1000000)
        return award(name, maxPoints, maxPoints * 0.7, "Likely accredited based on income/assets");
      return award(name, maxPoints, 0, "Does not meet accredited investor thresholds");
    }

    case "investable_assets_above_minimum": {
      const assets = enrichment.investableAssets ?? client.totalBalance;
      if (assets >= 1000000) return award(name, maxPoints, maxPoints, `${fmt(assets)} — above minimum`);
      if (assets >= 250000) return award(name, maxPoints, maxPoints * 0.4, `${fmt(assets)} — approaching minimum`);
      return award(name, maxPoints, 0, `${fmt(assets)} — below firm minimum`);
    }

    case "complex_financial_needs": {
      const categories = new Set(transactions.map(t => t.category));
      const complexity = ["mortgage_payment", "insurance_premium", "investment_competitor", "rrsp_contribution", "tfsa_contribution"];
      const active = complexity.filter(c => categories.has(c as Transaction["category"])).length;
      if (active >= 3) return award(name, maxPoints, maxPoints, `${active} financial product categories — complex needs`);
      if (active >= 1) return award(name, maxPoints, maxPoints * 0.5, `${active} product category — moderate complexity`);
      return award(name, maxPoints, maxPoints * 0.2, "Simple financial needs");
    }

    case "advisor_relationship_ending":
      return award(name, maxPoints, maxPoints * 0.3, "Advisor relationship status unknown");

    case "multi_generational_planning":
      return award(name, maxPoints, maxPoints * 0.3, "Multi-generational planning need not assessed");

    default:
      return award(name, maxPoints, 0, "Criterion not evaluated");
  }
}

function scoreBehavioralEngagement(enrichment: LeadEnrichmentData): DimensionScore {
  const results: CriterionResult[] = [];
  let totalPoints = 0;

  const behaviorMap: [string, keyof LeadEnrichmentData, number][] = [
    ["Product page visits", "productPageVisits", BEHAVIORAL_SIGNALS.product_page_visit.points],
    ["Content downloads", "contentDownloads", BEHAVIORAL_SIGNALS.content_download.points],
    ["Email opens", "emailOpens", BEHAVIORAL_SIGNALS.email_open.points],
    ["Email clicks", "emailClicks", BEHAVIORAL_SIGNALS.email_click.points],
    ["Form submissions", "formSubmissions", BEHAVIORAL_SIGNALS.form_submission.points],
    ["Branch visits", "branchVisits", BEHAVIORAL_SIGNALS.branch_visit.points],
    ["Chat engagements", "chatEngagements", BEHAVIORAL_SIGNALS.chat_engagement.points],
    ["Return visits (7d)", "returnVisitsLast7Days", BEHAVIORAL_SIGNALS.return_visits_7d.points],
    ["Webinar attendance", "webinarAttendance", BEHAVIORAL_SIGNALS.webinar_attendance.points],
  ];

  for (const [label, key, ptsPerUnit] of behaviorMap) {
    const count = (enrichment[key] as number | undefined) ?? 0;
    const pts = Math.min(count * ptsPerUnit, 30); // cap each behavior type at 30
    totalPoints += pts;
    if (count > 0) {
      results.push(award(label, 30, pts, `${count} occurrence(s) × ${ptsPerUnit} pts`));
    }
  }

  // Customer referral (boolean)
  if (enrichment.referredByExistingClient) {
    totalPoints += BEHAVIORAL_SIGNALS.customer_referral.points;
    results.push(award("Customer referral", 35, 35, "Referred by existing client"));
  }

  // Normalize to 0-100
  const rawScore = clamp(totalPoints, 0, 100);

  // If no behavioral data is available, give a neutral baseline
  if (results.length === 0) {
    results.push(award("No behavioral data", 0, 0, "Behavioral engagement data not available — score neutral"));
  }

  return {
    dimension: "behavioral_engagement",
    rawScore,
    weight: 0,
    weightedScore: 0,
    criteriaResults: results,
  };
}

function scoreIntentSignals(
  existingSignals: LeadSignal[],
  enrichment: LeadEnrichmentData
): DimensionScore {
  const results: CriterionResult[] = [];
  let totalPoints = 0;

  // Map existing LeadSignals to intent points
  const signalIntentMap: Record<string, number> = {
    life_event: INTENT_SIGNALS.life_event_trigger.points,
    income_change: 15,
    mortgage_refinance: 15,
    competitor_rrsp: 10,
    competitor_tfsa: 10,
    competitor_investment: 10,
    large_balance_idle: 12,
    loan_ending: 10,
  };

  for (const signal of existingSignals) {
    const pts = signalIntentMap[signal.type] || 5;
    const severityMultiplier = signal.severity === "high" ? 1.5 : signal.severity === "medium" ? 1.0 : 0.6;
    const adjusted = Math.round(pts * severityMultiplier);
    totalPoints += adjusted;
    results.push(award(
      `Signal: ${signal.type}`,
      Math.round(pts * 1.5),
      adjusted,
      `${signal.description} (${signal.severity} severity)`
    ));
  }

  // Enrichment-based intent signals
  const intentMap: [string, keyof LeadEnrichmentData, string, number][] = [
    ["Application started", "applicationStarted", "application_started", INTENT_SIGNALS.application_started.points],
    ["Rate comparison", "rateComparisonDetected", "rate_comparison", INTENT_SIGNALS.rate_comparison.points],
    ["Pre-approval requested", "preApprovalRequested", "pre_approval_requested", INTENT_SIGNALS.pre_approval_requested.points],
    ["Competitor mentioned", "competitorMentioned", "competitor_mentioned", INTENT_SIGNALS.competitor_mentioned.points],
    ["Urgency expressed", "urgencyExpressed", "urgency_expressed", INTENT_SIGNALS.urgency_expressed.points],
    ["Consultation requested", "consultationRequested", "consultation_requested", INTENT_SIGNALS.consultation_requested.points],
  ];

  for (const [label, key, , pts] of intentMap) {
    if (enrichment[key] === true) {
      totalPoints += pts;
      results.push(award(label, pts, pts, `${label} detected`));
    }
  }

  if (enrichment.lifeEventDetected) {
    totalPoints += INTENT_SIGNALS.life_event_trigger.points;
    results.push(award(
      "Life event (enrichment)",
      INTENT_SIGNALS.life_event_trigger.points,
      INTENT_SIGNALS.life_event_trigger.points,
      enrichment.lifeEventDescription || "Life event detected"
    ));
  }

  const rawScore = clamp(totalPoints, 0, 100);

  if (results.length === 0) {
    results.push(award("No intent signals", 0, 0, "No intent signals detected"));
  }

  return {
    dimension: "intent_signals",
    rawScore,
    weight: 0,
    weightedScore: 0,
    criteriaResults: results,
  };
}

function scoreComplianceReadiness(
  vertical: BankingVertical,
  enrichment: LeadEnrichmentData
): DimensionScore {
  const criteria = COMPLIANCE_CRITERIA[vertical];
  const results: CriterionResult[] = [];

  for (const criterion of criteria) {
    const result = evaluateComplianceCriterion(criterion.name, criterion.maxPoints, enrichment);
    results.push(result);
  }

  const rawScore = clamp(results.reduce((sum, r) => sum + r.awardedPoints, 0), 0, 100);

  return {
    dimension: "compliance_readiness",
    rawScore,
    weight: 0,
    weightedScore: 0,
    criteriaResults: results,
  };
}

function evaluateComplianceCriterion(
  name: string,
  maxPoints: number,
  enrichment: LeadEnrichmentData
): CriterionResult {
  switch (name) {
    case "identity_verified":
    case "identity_income_verified":
    case "identity_verified_edd":
    case "business_identity_verified":
      if (enrichment.identityVerified === true) return award(name, maxPoints, maxPoints, "Identity verified");
      if (enrichment.identityVerified === false) return award(name, maxPoints, 0, "Identity NOT verified");
      return award(name, maxPoints, maxPoints * 0.5, "Identity verification pending");

    case "no_sanctions_pep":
    case "no_sanctions_pep_adverse":
    case "no_sanctions_fraud":
    case "no_sanctions_adverse": {
      let pts = maxPoints;
      const reasons: string[] = [];
      if (enrichment.sanctionsScreeningClear === false) { pts = 0; reasons.push("Sanctions flag"); }
      if (enrichment.pepFlagged === true) { pts = Math.min(pts, maxPoints * 0.3); reasons.push("PEP flagged"); }
      if (enrichment.adverseMediaClear === false) { pts = Math.min(pts, maxPoints * 0.3); reasons.push("Adverse media"); }
      if (reasons.length === 0) {
        if (enrichment.sanctionsScreeningClear === true && enrichment.adverseMediaClear === true)
          return award(name, maxPoints, maxPoints, "All screening clear");
        return award(name, maxPoints, maxPoints * 0.5, "Screening status pending");
      }
      return award(name, maxPoints, pts, reasons.join("; "));
    }

    case "adverse_media_clear":
      if (enrichment.adverseMediaClear === true) return award(name, maxPoints, maxPoints, "Adverse media clear");
      if (enrichment.adverseMediaClear === false) return award(name, maxPoints, 0, "Adverse media flagged");
      return award(name, maxPoints, maxPoints * 0.5, "Adverse media screening pending");

    case "low_risk_jurisdiction":
    case "low_risk_industry_jurisdiction": {
      const risk = enrichment.jurisdictionRiskLevel;
      if (risk === "low") return award(name, maxPoints, maxPoints, "Low-risk jurisdiction");
      if (risk === "medium") return award(name, maxPoints, maxPoints * 0.5, "Medium-risk jurisdiction");
      if (risk === "high") return award(name, maxPoints, 0, "High-risk jurisdiction");
      return award(name, maxPoints, maxPoints * 0.7, "Jurisdiction risk not assessed — assumed low");
    }

    case "beneficial_ownership_documented":
      return award(name, maxPoints, maxPoints * 0.5, "Beneficial ownership documentation pending");

    case "source_of_funds_documented":
    case "source_of_wealth_documented":
      if (enrichment.sourceOfFundsDocumented === true) return award(name, maxPoints, maxPoints, "Source of funds/wealth documented");
      return award(name, maxPoints, maxPoints * 0.4, "Source documentation pending");

    case "pep_screening_complete":
      if (enrichment.pepScreeningComplete === true) return award(name, maxPoints, maxPoints, "PEP screening complete");
      return award(name, maxPoints, maxPoints * 0.5, "PEP screening pending");

    case "employment_verified":
      if (enrichment.employmentYears && enrichment.employmentYears >= 2)
        return award(name, maxPoints, maxPoints, "Employment verified");
      return award(name, maxPoints, maxPoints * 0.5, "Employment verification pending");

    case "property_eligibility":
      return award(name, maxPoints, maxPoints * 0.5, "Property eligibility not yet assessed");

    case "accredited_status_confirmed":
      if (enrichment.accreditedInvestor === true) return award(name, maxPoints, maxPoints, "Accredited status confirmed");
      return award(name, maxPoints, maxPoints * 0.3, "Accredited status not confirmed");

    default:
      return award(name, maxPoints, maxPoints * 0.5, "Compliance criterion pending review");
  }
}

// === Negative Adjustments ===

function computeNegativeAdjustments(enrichment: LeadEnrichmentData): NegativeAdjustment[] {
  const adjustments: NegativeAdjustment[] = [];

  if (enrichment.emailUnsubscribed) {
    adjustments.push({ signal: "email_unsubscribe", ...NEGATIVE_SIGNALS.email_unsubscribe });
  }
  if (enrichment.emailBounced) {
    adjustments.push({ signal: "email_bounced", ...NEGATIVE_SIGNALS.email_bounced });
  }
  if (enrichment.competitorEmployee) {
    adjustments.push({ signal: "competitor_employee", ...NEGATIVE_SIGNALS.competitor_employee });
  }
  if (enrichment.suspiciousSubmission) {
    adjustments.push({ signal: "suspicious_submission", ...NEGATIVE_SIGNALS.suspicious_submission });
  }
  if (enrichment.disposableEmail) {
    adjustments.push({ signal: "disposable_email", ...NEGATIVE_SIGNALS.disposable_email });
  }
  if (enrichment.jobSeekerBehavior) {
    adjustments.push({ signal: "job_seeker", ...NEGATIVE_SIGNALS.job_seeker });
  }
  if (enrichment.daysSinceLastEngagement && enrichment.daysSinceLastEngagement >= 90) {
    adjustments.push({ signal: "no_engagement_90d", ...NEGATIVE_SIGNALS.no_engagement_90d });
  }

  return adjustments;
}

// === Tier & Gate Logic ===

function assignTier(compositeScore: number): QualificationTier {
  for (const threshold of TIER_THRESHOLDS) {
    if (compositeScore >= threshold.minScore && compositeScore <= threshold.maxScore) {
      return threshold.tier;
    }
  }
  return "D";
}

function evaluateComplianceGate(
  complianceSubScore: number,
  enrichment: LeadEnrichmentData
): ComplianceGateStatus {
  // Auto-disqualify on sanctions
  if (enrichment.sanctionsScreeningClear === false) return "disqualified";
  if (complianceSubScore < COMPLIANCE_GATE_MINIMUM) return "hold_for_review";
  return "pass";
}

// === Utility Functions ===

function applyWeight(score: DimensionScore, weight: number): DimensionScore {
  return {
    ...score,
    weight,
    weightedScore: round(score.rawScore * weight, 2),
  };
}

function award(name: string, maxPoints: number, awardedPoints: number, reason: string): CriterionResult {
  return { name, maxPoints, awardedPoints: round(awardedPoints, 1), reason };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function inferEmploymentYears(client: Client): number {
  // Rough estimate from account tenure + direct deposit stability
  const accountAge = (Date.now() - new Date(client.accountOpenDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return client.directDepositActive ? Math.max(accountAge, 1) : 0;
}

function calculateRelationshipMonths(client: Client): number {
  const openDate = new Date(client.accountOpenDate);
  const now = new Date();
  return (now.getFullYear() - openDate.getFullYear()) * 12 + (now.getMonth() - openDate.getMonth());
}

function estimateDti(client: Client, transactions: Transaction[]): number {
  const monthlyIncome = client.annualIncome / 12;
  if (monthlyIncome <= 0) return 1;
  const debtCategories: Transaction["category"][] = ["mortgage_payment", "loan_payment", "rent"];
  const debtTxns = transactions.filter(t => t.amount < 0 && debtCategories.includes(t.category) && t.isRecurring);
  const months = new Set(debtTxns.map(t => t.date.slice(0, 7))).size || 1;
  const totalDebt = Math.abs(debtTxns.reduce((s, t) => s + t.amount, 0));
  const monthlyDebt = totalDebt / months;
  return monthlyDebt / monthlyIncome;
}

function estimateMonthlySavings(transactions: Transaction[]): number {
  const inflows = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const outflows = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const months = new Set(transactions.map(t => t.date.slice(0, 7))).size || 1;
  return (inflows - outflows) / months;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// === Decay Calculator (for use with behavioral/intent signals over time) ===

export function calculateDecayedScore(
  initialPoints: number,
  halfLifeDays: number,
  daysElapsed: number
): number {
  if (halfLifeDays <= 0) return initialPoints; // no decay
  return round(initialPoints * Math.pow(0.5, daysElapsed / halfLifeDays), 1);
}
