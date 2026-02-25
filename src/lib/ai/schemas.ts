/**
 * Zod validation schemas for all AI tool responses.
 *
 * These are the single source of truth for response shapes. Every AI response
 * (Claude, Groq, or self-healed) is validated against these schemas before
 * being accepted. This prevents malformed data from reaching the database.
 */

import { z } from "zod";

// ── Coercion helpers ────────────────────────────────────────────────────────
// AI models sometimes return numbers as strings ("85" instead of 85) or
// booleans as strings ("true" instead of true). These preprocess wrappers
// fix the most common cases without the pitfalls of z.coerce.

/** Accept a real number OR a numeric string and always produce a number. */
const CoercedNumber = z.preprocess(
  (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
  z.number()
);

/** Accept a real boolean OR the strings "true"/"false". */
const CoercedBoolean = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      if (val.toLowerCase() === "true") return true;
      if (val.toLowerCase() === "false") return false;
    }
    return val;
  },
  z.boolean()
);

// ── Shared sub-schemas ──────────────────────────────────────────────────────

const SeveritySchema = z.enum(["high", "medium", "low"]);
const ConfidenceSchema = z.enum(["high", "medium", "low"]);

const SignalSchema = z.object({
  type: z.string(),
  description: z.string(),
  severity: SeveritySchema,
  estimatedValue: CoercedNumber,
});

const RecommendedActionSchema = z.object({
  priority: CoercedNumber,
  action: z.string(),
  rationale: z.string(),
  estimatedImpact: z.string(),
  requiresHumanApproval: CoercedBoolean,
});

// ── 1. submit_lead_analysis (engine.ts) ─────────────────────────────────────

export const LeadAnalysisSchema = z.object({
  score: CoercedNumber,
  confidence: ConfidenceSchema,
  signals: z.array(SignalSchema),
  summary: z.string(),
  detailedReasoning: z.string(),
  recommendedActions: z.array(RecommendedActionSchema),
  humanDecisionRequired: z.string(),
});
export type LeadAnalysisResult = z.infer<typeof LeadAnalysisSchema>;

// ── 2. submit_lead_from_notes (lead-from-notes.ts) ─────────────────────────

const ClientProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  occupation: z.string(),
  city: z.string(),
  province: z.string(),
  estimatedAnnualIncome: CoercedNumber,
  estimatedAge: CoercedNumber,
});

export const LeadFromNotesSchema = z.object({
  clientProfile: ClientProfileSchema,
  analysis: LeadAnalysisSchema,
});
export type LeadFromNotesResult = z.infer<typeof LeadFromNotesSchema>;

// ── 3. submit_notes_analysis (notes-analyzer.ts) ───────────────────────────

const NoteSignalSchema = z.object({
  type: z.string(),
  description: z.string(),
  severity: SeveritySchema,
});

export const NotesAnalysisSchema = z.object({
  insights: z.array(z.string()),
  newSignals: z.array(NoteSignalSchema),
  updatedRecommendations: z.array(z.string()),
  summaryAddendum: z.string(),
  scoreAdjustment: CoercedNumber,
});
export type NotesAnalysisResult = z.infer<typeof NotesAnalysisSchema>;

// ── 4. submit_competitor_comparison (competitor-compare/route.ts) ───────────

const DifferentiatorSchema = z.object({
  area: z.string(),
  competitor: z.string(),
  wealthsimple: z.string(),
  advantage: z.enum(["wealthsimple", "competitor", "neutral"]),
});

export const CompetitorComparisonSchema = z.object({
  competitorName: z.string(),
  competitorPros: z.array(z.string()),
  competitorCons: z.array(z.string()),
  wealthsimplePros: z.array(z.string()),
  wealthsimpleCons: z.array(z.string()),
  valueStatement: z.string(),
  keyDifferentiators: z.array(DifferentiatorSchema),
  switchingConsiderations: z.string(),
});
export type CompetitorComparisonResult = z.infer<typeof CompetitorComparisonSchema>;
