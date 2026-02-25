/**
 * Zod validation schemas for all AI tool responses.
 *
 * These are the single source of truth for response shapes. Every AI response
 * (Claude, Groq, or self-healed) is validated against these schemas before
 * being accepted. This prevents malformed data from reaching the database.
 */

import { z } from "zod";

// ── Shared sub-schemas ──────────────────────────────────────────────────────

const SeveritySchema = z.enum(["high", "medium", "low"]);
const ConfidenceSchema = z.enum(["high", "medium", "low"]);

const SignalSchema = z.object({
  type: z.string(),
  description: z.string(),
  severity: SeveritySchema,
  estimatedValue: z.number(),
});

const RecommendedActionSchema = z.object({
  priority: z.number(),
  action: z.string(),
  rationale: z.string(),
  estimatedImpact: z.string(),
  requiresHumanApproval: z.boolean(),
});

// ── 1. submit_lead_analysis (engine.ts) ─────────────────────────────────────

export const LeadAnalysisSchema = z.object({
  score: z.number(),
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
  estimatedAnnualIncome: z.number(),
  estimatedAge: z.number(),
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
  scoreAdjustment: z.number(),
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
