import type { Transaction, LeadSignal, SignalType } from "@/types";

// Known competitor financial institution patterns
const COMPETITOR_INVESTMENT_PATTERNS = [
  { pattern: /TD DIRECT INVESTING/i, name: "TD Direct Investing" },
  { pattern: /TD WATERHOUSE/i, name: "TD Waterhouse" },
  { pattern: /RBC DOMINION SECURITIES/i, name: "RBC Dominion Securities" },
  { pattern: /RBC DIRECT INVESTING/i, name: "RBC Direct Investing" },
  { pattern: /BMO INVESTORLINE/i, name: "BMO InvestorLine" },
  { pattern: /BMO MUTUAL FUNDS/i, name: "BMO Mutual Funds" },
  { pattern: /CIBC INVESTORS? EDGE/i, name: "CIBC Investor's Edge" },
  { pattern: /SCOTIABANK ITRADE/i, name: "Scotiabank iTRADE" },
  { pattern: /SCOTIA MCLEOD/i, name: "Scotia McLeod" },
  { pattern: /DESJARDINS SECURITIES/i, name: "Desjardins Securities" },
  { pattern: /NATIONAL BANK DIRECT/i, name: "National Bank Direct" },
  { pattern: /QUESTWEALTH/i, name: "Questwealth Portfolios" },
  { pattern: /QUESTRADE/i, name: "Questrade" },
  { pattern: /MANULIFE SECURITIES/i, name: "Manulife Securities" },
  { pattern: /SUN LIFE FINANCIAL.*(?:RRSP|INVEST|GRP)/i, name: "Sun Life Financial" },
  { pattern: /EDWARD JONES/i, name: "Edward Jones" },
  { pattern: /IG WEALTH/i, name: "IG Wealth Management" },
];

const MORTGAGE_PATTERNS = [
  /MORTGAGE/i, /MTG PAD/i, /CMHC/i, /MCAP/i, /FIRST NATIONAL MTG/i,
];

const INSURANCE_PATTERNS = [
  /SUN LIFE/i, /MANULIFE/i, /GREAT-WEST LIFE/i, /CANADA LIFE/i,
  /EQUITABLE LIFE/i, /MEDAVIE/i, /BLUE CROSS/i, /EMPIRE LIFE/i,
];

export function detectSignals(
  transactions: Transaction[],
  totalBalance: number,
  annualIncome: number
): LeadSignal[] {
  const signals: LeadSignal[] = [];

  // 1. Competitor Investment PADs
  const competitorTxns = transactions.filter(t =>
    t.amount < 0 && COMPETITOR_INVESTMENT_PATTERNS.some(p => p.pattern.test(t.description))
  );
  if (competitorTxns.length > 0) {
    const grouped = groupByMerchant(competitorTxns, COMPETITOR_INVESTMENT_PATTERNS);
    for (const [name, txns] of Object.entries(grouped)) {
      const monthlyAmount = Math.abs(averageMonthlyAmount(txns));
      const isRrsp = txns.some(t => /RRSP/i.test(t.description));
      const isTfsa = txns.some(t => /TFSA/i.test(t.description));
      const type: SignalType = isRrsp ? "competitor_rrsp" : isTfsa ? "competitor_tfsa" : "competitor_investment";

      signals.push({
        type,
        description: `${formatCurrency(monthlyAmount)}/mo flowing to ${name}${isRrsp ? " (RRSP)" : isTfsa ? " (TFSA)" : ""}`,
        severity: monthlyAmount >= 2000 ? "high" : monthlyAmount >= 500 ? "medium" : "low",
        relatedTransactionIds: txns.map(t => t.id),
        estimatedValue: monthlyAmount * 12,
      });
    }
  }

  // 2. Mortgage at Other Institution
  const mortgageTxns = transactions.filter(t =>
    t.amount < 0 && t.isRecurring && MORTGAGE_PATTERNS.some(p => p.test(t.description))
  );
  if (mortgageTxns.length >= 3) {
    const monthlyAmount = Math.abs(averageMonthlyAmount(mortgageTxns));
    signals.push({
      type: "mortgage_refinance",
      description: `Mortgage payment of ${formatCurrency(monthlyAmount)}/mo to another institution`,
      severity: monthlyAmount >= 2500 ? "high" : "medium",
      relatedTransactionIds: mortgageTxns.map(t => t.id),
      estimatedValue: monthlyAmount * 12 * 5, // rough mortgage balance estimate
    });
  }

  // 3. Income Change Detection
  const salaryTxns = transactions
    .filter(t => t.amount > 0 && (t.type === "direct-deposit" || t.category === "salary_deposit"))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (salaryTxns.length >= 4) {
    const midpoint = Math.floor(salaryTxns.length / 2);
    const earlyAvg = average(salaryTxns.slice(0, midpoint).map(t => t.amount));
    const recentAvg = average(salaryTxns.slice(midpoint).map(t => t.amount));

    if (recentAvg > earlyAvg * 1.1) {
      const increase = ((recentAvg - earlyAvg) / earlyAvg * 100).toFixed(0);
      signals.push({
        type: "income_change",
        description: `Income increased ~${increase}% recently (${formatCurrency(earlyAvg)} → ${formatCurrency(recentAvg)})`,
        severity: Number(increase) >= 20 ? "high" : "medium",
        relatedTransactionIds: salaryTxns.slice(midpoint).map(t => t.id),
        estimatedValue: (recentAvg - earlyAvg) * 24,
      });
    }
  }

  // 4. Large Idle Balance
  if (totalBalance > 25000) {
    const hasInvestments = transactions.some(t =>
      t.amount < 0 && (
        t.category === "investment_competitor" ||
        t.category === "rrsp_contribution" ||
        t.category === "tfsa_contribution"
      )
    );
    if (!hasInvestments) {
      signals.push({
        type: "large_balance_idle",
        description: `${formatCurrency(totalBalance)} sitting in chequing with no investment activity`,
        severity: totalBalance >= 50000 ? "high" : "medium",
        relatedTransactionIds: [],
        estimatedValue: totalBalance,
      });
    }
  }

  // 5. Loan Ending
  const loanTxns = transactions
    .filter(t => t.category === "loan_payment")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (loanTxns.length >= 2) {
    const lastLoan = loanTxns[loanTxns.length - 1];
    const lastLoanDate = new Date(lastLoan.date);
    const now = new Date("2026-02-24");
    const monthsSinceLast = (now.getFullYear() - lastLoanDate.getFullYear()) * 12 + (now.getMonth() - lastLoanDate.getMonth());

    if (monthsSinceLast >= 1) {
      signals.push({
        type: "loan_ending",
        description: `Student loan payments appear to have ended — freed up ${formatCurrency(Math.abs(loanTxns[0].amount))}/mo`,
        severity: "medium",
        relatedTransactionIds: loanTxns.map(t => t.id),
        estimatedValue: Math.abs(loanTxns[0].amount) * 12,
      });
    }
  }

  // 6. Large One-Time Deposits (Life Events)
  const largDeposits = transactions.filter(t =>
    t.amount > 10000 && !t.isRecurring && t.category !== "salary_deposit"
  );
  for (const txn of largDeposits) {
    signals.push({
      type: "life_event",
      description: `Large deposit of ${formatCurrency(txn.amount)}: "${txn.description}"`,
      severity: txn.amount >= 20000 ? "high" : "medium",
      relatedTransactionIds: [txn.id],
      estimatedValue: txn.amount,
    });
  }

  // 7. Insurance at Competitors
  const insuranceTxns = transactions.filter(t =>
    t.amount < 0 && t.category === "insurance_premium" &&
    INSURANCE_PATTERNS.some(p => p.test(t.description))
  );
  if (insuranceTxns.length >= 3) {
    const monthlyAmount = Math.abs(averageMonthlyAmount(insuranceTxns));
    signals.push({
      type: "competitor_insurance",
      description: `Insurance premiums of ${formatCurrency(monthlyAmount)}/mo to competitor`,
      severity: "low",
      relatedTransactionIds: insuranceTxns.map(t => t.id),
      estimatedValue: monthlyAmount * 12,
    });
  }

  return signals;
}

// Helpers
function groupByMerchant(
  txns: Transaction[],
  patterns: typeof COMPETITOR_INVESTMENT_PATTERNS
): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const txn of txns) {
    for (const { pattern, name } of patterns) {
      if (pattern.test(txn.description)) {
        if (!groups[name]) groups[name] = [];
        groups[name].push(txn);
        break;
      }
    }
  }
  return groups;
}

function averageMonthlyAmount(txns: Transaction[]): number {
  if (txns.length === 0) return 0;
  const total = txns.reduce((sum, t) => sum + t.amount, 0);
  const months = new Set(txns.map(t => t.date.slice(0, 7))).size || 1;
  return total / months;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}
