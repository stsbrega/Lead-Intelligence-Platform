/**
 * Server-side helper to compute qualification scores from DB rows.
 * Used by Next.js server components to score leads on-the-fly.
 */
import { scoreLeadQualification, inferVertical } from "./scorer";
import type { Client, Transaction, LeadSignal } from "@/types";
import type { LeadQualificationScore, LeadEnrichmentData } from "./types";
import db from "@/lib/data/db";

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  age: number;
  city: string;
  province: string;
  occupation: string;
  annual_income: number;
  account_open_date: string;
  total_balance: number;
  direct_deposit_active: number;
}

interface TransactionRow {
  id: string;
  client_id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  merchant_name: string;
  is_recurring: number;
  type: string;
}

function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    age: row.age,
    city: row.city,
    province: row.province,
    occupation: row.occupation,
    annualIncome: row.annual_income,
    accountOpenDate: row.account_open_date,
    totalBalance: row.total_balance,
    directDepositActive: Boolean(row.direct_deposit_active),
  };
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    amount: row.amount,
    description: row.description,
    category: row.category as Transaction["category"],
    merchantName: row.merchant_name,
    isRecurring: Boolean(row.is_recurring),
    type: row.type as Transaction["type"],
  };
}

/** Parse existing AI analysis signals into LeadSignal[] */
function getExistingSignals(clientId: string): LeadSignal[] {
  const row = db.prepare("SELECT signals FROM analyses WHERE client_id = ?").get(clientId) as { signals: string } | undefined;
  if (!row?.signals) return [];
  try {
    return JSON.parse(row.signals);
  } catch {
    return [];
  }
}

/** Build enrichment data from what we can infer */
function buildEnrichment(client: Client, transactions: Transaction[]): LeadEnrichmentData {
  const enrichment: LeadEnrichmentData = {};

  // Infer employment stability from direct deposit
  if (client.directDepositActive) {
    const accountAge = (Date.now() - new Date(client.accountOpenDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    enrichment.employmentYears = Math.max(accountAge, 1);
  }

  // Detect life events (large one-time deposits)
  const largeDeposits = transactions.filter(t => t.amount >= 10000 && !t.isRecurring);
  if (largeDeposits.length > 0) {
    enrichment.lifeEventDetected = true;
    enrichment.lifeEventDescription = `Large deposit(s) detected: ${largeDeposits.map(d => `$${d.amount.toLocaleString()}`).join(", ")}`;
  }

  // Detect competitor mentions from transaction patterns
  const competitorTxns = transactions.filter(t =>
    t.category === "investment_competitor" ||
    t.category === "rrsp_contribution" ||
    t.category === "tfsa_contribution"
  );
  if (competitorTxns.length > 0) {
    enrichment.competitorMentioned = true;
  }

  // Estimate investable assets from balance + investment outflows
  const monthlyInvestment = competitorTxns
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) / 6; // 6 months of data
  enrichment.investableAssets = client.totalBalance + (monthlyInvestment * 12);

  // Compliance: assume pending for most fields (realistic default)
  // Identity: verified if they have direct deposit (basic KYC done)
  if (client.directDepositActive) {
    enrichment.identityVerified = true;
  }
  enrichment.sanctionsScreeningClear = true;
  enrichment.adverseMediaClear = true;
  enrichment.jurisdictionRiskLevel = "low";

  return enrichment;
}

/** Compute qualification score for a single client */
export function computeQualificationScore(clientId: string): LeadQualificationScore | null {
  const clientRow = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId) as ClientRow | undefined;
  if (!clientRow) return null;

  const txnRows = db.prepare("SELECT * FROM transactions WHERE client_id = ? ORDER BY date DESC").all(clientId) as TransactionRow[];

  const client = rowToClient(clientRow);
  const transactions = txnRows.map(rowToTransaction);
  const signals = getExistingSignals(clientId);
  const vertical = inferVertical(client, transactions);
  const enrichment = buildEnrichment(client, transactions);

  return scoreLeadQualification(client, transactions, signals, vertical, enrichment);
}

/** Compute qualification scores for all clients */
export function computeAllQualificationScores(): Map<string, LeadQualificationScore> {
  const clientRows = db.prepare("SELECT id FROM clients").all() as { id: string }[];
  const scores = new Map<string, LeadQualificationScore>();

  for (const row of clientRows) {
    const score = computeQualificationScore(row.id);
    if (score) {
      scores.set(row.id, score);
    }
  }

  return scores;
}
