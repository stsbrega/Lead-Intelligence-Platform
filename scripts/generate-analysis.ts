/**
 * Pre-generate AI analyses for all 10 clients.
 *
 * Usage:
 *   With Claude API:  ANTHROPIC_API_KEY=sk-... npx tsx scripts/generate-analysis.ts
 *   Without API:      npx tsx scripts/generate-analysis.ts --mock
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "leads.db");
const db = new Database(DB_PATH);

const schemaPath = path.join(process.cwd(), "src", "lib", "data", "schema.sql");
if (fs.existsSync(schemaPath)) {
  db.exec(fs.readFileSync(schemaPath, "utf-8"));
}

const useMock = process.argv.includes("--mock") || !process.env.ANTHROPIC_API_KEY;

// Pre-built analyses for reliable demo
const MOCK_ANALYSES: Record<string, {
  score: number;
  confidence: string;
  signals: { type: string; description: string; severity: string; estimatedValue: number; relatedTransactionIds: string[] }[];
  summary: string;
  detailedReasoning: string;
  recommendedActions: { priority: number; action: string; rationale: string; estimatedImpact: string; requiresHumanApproval: boolean }[];
  humanDecisionRequired: string;
}> = {
  c001: {
    score: 82,
    confidence: "high",
    signals: [
      { type: "competitor_rrsp", description: "$2,000/mo flowing to TD Direct Investing (RRSP)", severity: "high", estimatedValue: 24000, relatedTransactionIds: [] },
      { type: "competitor_tfsa", description: "$500/mo flowing to TD Direct Investing (TFSA)", severity: "medium", estimatedValue: 6000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $89/mo to Equitable Life", severity: "low", estimatedValue: 1068, relatedTransactionIds: [] },
    ],
    summary: "Priya is a high-income tech professional with $2,500/month in investment contributions flowing to TD Direct Investing. Combined RRSP and TFSA opportunity represents ~$30K annually in competitor AUM. Strong consolidation candidate.",
    detailedReasoning: "Analysis of 6 months of transactions reveals consistent biweekly direct deposits of $5,960 from Shopify Inc., confirming a senior software engineering salary of approximately $155K. The most significant finding is $2,000/month in PADs to TD Direct Investing for RRSP contributions and an additional $500/month for TFSA — totaling $30,000/year in investment contributions at a competitor.\n\nWith a chequing balance of $47,200 and stable high income, Priya has significant capacity for additional investment. Her disciplined savings pattern (consistent monthly contributions) suggests she would be receptive to a consolidation conversation if presented with clear benefits — lower fees, integrated platform, or tax optimization.\n\nThe $89/month insurance premium to Equitable Life is a secondary signal but indicates she is proactive about financial planning. Rent of $2,200/month in Toronto suggests she may also be a candidate for FHSA if she doesn't own property.",
    recommendedActions: [
      { priority: 1, action: "Schedule RRSP/TFSA consolidation review", rationale: "TD Direct Investing charges higher fees than Wealthsimple's managed portfolios. Present fee comparison and integrated platform benefits.", estimatedImpact: "~$30K/year in AUM consolidation", requiresHumanApproval: true },
      { priority: 2, action: "Explore FHSA eligibility", rationale: "Renting at $2,200/mo in Toronto — if first-time buyer, FHSA offers tax-deductible + tax-free growth for down payment.", estimatedImpact: "Up to $8K/year in new contributions", requiresHumanApproval: true },
      { priority: 3, action: "Review insurance coverage", rationale: "Equitable Life premiums suggest individual coverage — review if adequate for income level.", estimatedImpact: "Cross-sell opportunity", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must determine whether consolidating Priya's TD investments to Wealthsimple actually serves her best interest. Transaction data shows the outflows, but cannot reveal: her specific investment holdings and performance at TD, whether she has employer-matched RRSP at Shopify through TD, her risk tolerance and investment goals, or whether TD offers her any preferential pricing. A suitability assessment through direct conversation is required before recommending any product change.",
  },
  c002: {
    score: 52,
    confidence: "medium",
    signals: [
      { type: "competitor_tfsa", description: "$300/mo flowing to Desjardins Securities (TFSA)", severity: "medium", estimatedValue: 3600, relatedTransactionIds: [] },
      { type: "income_change", description: "New tutoring side income of ~$500/mo detected in recent months", severity: "low", estimatedValue: 6000, relatedTransactionIds: [] },
    ],
    summary: "Jean-Luc has a moderate TFSA contribution to Desjardins Securities and has recently started earning tutoring side income. Opportunity is modest but his new income stream may create capacity for additional investment.",
    detailedReasoning: "Jean-Luc is a Quebec high school teacher with stable biweekly income of $2,769 from CSDM (Commission scolaire). His $300/month TFSA contribution to Desjardins Securities represents a modest but consistent investment pattern.\n\nThe emerging signal is new tutoring income ($400-600/month) appearing in the last 3 months via Interac e-Transfer. This suggests either a lifestyle change or seasonal tutoring, and represents newly available capital that could be directed to additional investment.\n\nHis overall financial picture is conservative — modest income, reasonable expenses, steady Quebec pension contributions. The Desjardins relationship is likely deeply entrenched (cultural and institutional ties in Quebec). Consolidation is possible but the opportunity size is smaller than other leads.",
    recommendedActions: [
      { priority: 1, action: "Discuss investing the new tutoring income", rationale: "New ~$500/mo side income is not being invested anywhere. This is a natural conversation opener.", estimatedImpact: "~$6K/year in new contributions", requiresHumanApproval: true },
      { priority: 2, action: "Present TFSA fee comparison vs Desjardins", rationale: "Desjardins Securities may charge higher management fees. A transparent fee comparison could motivate consolidation.", estimatedImpact: "~$3.6K/year AUM transfer", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must assess whether Jean-Luc's Desjardins relationship has non-financial value (cultural, employer-linked, family ties common in Quebec) that makes consolidation inappropriate. The tutoring income may be seasonal — the advisor should verify its permanence before recommending new recurring investment commitments.",
  },
  c003: {
    score: 71,
    confidence: "medium",
    signals: [
      { type: "mortgage_refinance", description: "Mortgage payment of $2,800/mo to CIBC", severity: "high", estimatedValue: 168000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Business insurance premiums of $450/mo to Manulife", severity: "low", estimatedValue: 5400, relatedTransactionIds: [] },
      { type: "spending_pattern", description: "Irregular business income ($3K-$8K/mo) suggests cash flow management needs", severity: "medium", estimatedValue: 0, relatedTransactionIds: [] },
    ],
    summary: "Marcus is a restaurant owner with a CIBC mortgage ($2,800/mo) and fluctuating business income. As Wealthsimple develops lending products, he represents a strong mortgage refinancing prospect. His variable income also suggests need for cash management advice.",
    detailedReasoning: "Marcus operates a restaurant (Golden Wok) in Vancouver with irregular business deposits ranging from $3,000 to $8,000 monthly via Interac e-Transfer. His $2,800/month CIBC mortgage is the largest single outflow, followed by significant operational expenses (Sysco Foods for supplies, BC Hydro, Manulife business insurance).\n\nThe income variability is notable — some months see strong revenue while others are leaner. This creates both opportunity and risk. CRA tax installments of $3,500 quarterly indicate his income is high enough to require installment payments.\n\nThe mortgage at CIBC is the primary opportunity, especially as Wealthsimple builds out its lending products. A $2,800/month payment at current rates suggests a mortgage balance in the $400-500K range — a significant relationship to capture.",
    recommendedActions: [
      { priority: 1, action: "Flag for mortgage product launch outreach", rationale: "When Wealthsimple's lending products launch, Marcus's $400K+ CIBC mortgage is a prime refinancing target.", estimatedImpact: "~$400K+ mortgage opportunity", requiresHumanApproval: true },
      { priority: 2, action: "Discuss business cash management", rationale: "Variable business income creates opportunity for high-interest savings optimization during strong months.", estimatedImpact: "Improved savings yield on idle business cash", requiresHumanApproval: true },
      { priority: 3, action: "Review corporate investment structure", rationale: "As a business owner, Marcus may benefit from corporate investing account for tax-efficient retained earnings.", estimatedImpact: "New corporate account opening", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must understand Marcus's full business financial picture before any recommendation. Restaurant businesses carry specific risks — the advisor cannot determine from transactions alone whether the business is healthy, whether the CIBC mortgage has favorable terms tied to a business banking relationship, or whether Marcus has adequate emergency reserves for his variable-income situation.",
  },
  c004: {
    score: 87,
    confidence: "high",
    signals: [
      { type: "competitor_investment", description: "$3,000/mo flowing to RBC Dominion Securities", severity: "high", estimatedValue: 36000, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $2,400/mo to RBC", severity: "high", estimatedValue: 144000, relatedTransactionIds: [] },
      { type: "income_change", description: "Income increased ~15% recently ($6,200 → $7,115 per pay)", severity: "medium", estimatedValue: 21960, relatedTransactionIds: [] },
    ],
    summary: "Aisha has $3,000/month in investment contributions to RBC Dominion Securities plus an RBC mortgage ($2,400/mo), representing a deeply entrenched RBC relationship worth $36K+ annually. A recent ~15% salary increase creates additional investment capacity. High-value consolidation target.",
    detailedReasoning: "Aisha is a petroleum engineer at Cenovus Energy with a recently increased salary (from ~$161K to ~$185K annualized based on biweekly deposits). Her $3,000/month to RBC Dominion Securities is one of the largest competitor investment flows in the portfolio, suggesting accumulated assets potentially in the $200-400K range.\n\nCritically, she has both an investment AND mortgage relationship with RBC, which creates a deeper entrenchment but also a larger consolidation opportunity. The RBC mortgage at $2,400/month suggests a balance around $350-450K.\n\nThe recent income increase of approximately $915 per biweekly pay ($23,790/year) represents newly available capital. Great-West Life insurance premiums of $175/month round out a picture of a financially organized professional who actively plans.\n\nThe concentration of financial products at a single competitor (RBC) actually simplifies the consolidation conversation — one competitor to address, not many.",
    recommendedActions: [
      { priority: 1, action: "Schedule comprehensive portfolio review", rationale: "RBC Dominion Securities typically charges 1-1.5% management fees. Wealthsimple's lower fee structure is a compelling conversation for $36K+/year in contributions.", estimatedImpact: "~$36K/year AUM + accumulated balance (~$200-400K)", requiresHumanApproval: true },
      { priority: 2, action: "Discuss deploying salary increase", rationale: "~$24K/year in new income is unallocated. Proactive investment planning conversation.", estimatedImpact: "~$24K/year in new contributions", requiresHumanApproval: true },
      { priority: 3, action: "Flag for mortgage product outreach", rationale: "RBC mortgage up for renewal will be a natural consolidation moment.", estimatedImpact: "~$350-450K mortgage relationship", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must determine whether Aisha's RBC relationship includes any employer-linked benefits (Cenovus may have a corporate banking relationship with RBC), whether RBC offers her preferential mortgage rates tied to her investment assets, and whether consolidation would actually result in better outcomes. The income increase may also be temporary (bonus, contract change) rather than permanent.",
  },
  c005: {
    score: 58,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$800/mo flowing to BMO Mutual Funds", severity: "medium", estimatedValue: 9600, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $220/mo to Medavie Blue Cross", severity: "low", estimatedValue: 2640, relatedTransactionIds: [] },
    ],
    summary: "Sarah is a retired nurse with pension income (CPP, OAS, NS Health Authority) and $800/month flowing to BMO Mutual Funds. As a retiree, her needs center on income planning and capital preservation rather than growth.",
    detailedReasoning: "Sarah's income is composed of three streams: CPP ($1,200/mo), OAS ($730/mo), and NS Health Authority pension ($2,100/mo), totaling approximately $4,030/month or $48,360/year. Her $800/month to BMO Mutual Funds represents the single investment outflow.\n\nWith a chequing balance of $89,400 — notably high for a retiree — there's a potential idle cash signal. However, retirees often maintain higher liquidity for healthcare needs, emergencies, or planned expenditures.\n\nThe Medavie Blue Cross premiums suggest supplementary health insurance beyond what her pension plan provides. At 67, she is in the early stage of retirement with potentially 20+ years of income needs ahead.\n\nThe BMO Mutual Fund relationship likely involves higher MER funds (1-2%+). A fee comparison could be meaningful over time, especially for a retiree sensitive to fee drag on a capital preservation portfolio.",
    recommendedActions: [
      { priority: 1, action: "Present BMO fund fee comparison", rationale: "BMO mutual funds typically carry 1-2%+ MER. Over a 20-year retirement, fee savings could be substantial.", estimatedImpact: "~$9.6K/year AUM + accumulated balance", requiresHumanApproval: true },
      { priority: 2, action: "Review retirement income optimization", rationale: "High chequing balance ($89K) may indicate suboptimal cash allocation. Could benefit from high-interest savings or GIC ladder.", estimatedImpact: "Higher yield on idle cash", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must understand Sarah's complete retirement picture before recommending any changes. Retirees have specific needs: predictable income, capital preservation, accessibility for healthcare costs. Transaction data cannot reveal whether her BMO funds are in a RRIF with mandatory minimums, whether she has planned large expenses (home repair, family gifts), or her comfort with any investment changes at this life stage. Retiree advice carries heightened fiduciary responsibility.",
  },
  c006: {
    score: 94,
    confidence: "high",
    signals: [
      { type: "competitor_rrsp", description: "$3,000/mo flowing to Sun Life Financial Group RRSP", severity: "high", estimatedValue: 36000, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$2,200/mo flowing to Manulife Securities", severity: "high", estimatedValue: 26400, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $3,200/mo to TD", severity: "high", estimatedValue: 192000, relatedTransactionIds: [] },
      { type: "large_balance_idle", description: "$147,300 sitting in chequing with no Wealthsimple investment activity", severity: "high", estimatedValue: 147300, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Disability insurance of $380/mo to Sun Life", severity: "low", estimatedValue: 4560, relatedTransactionIds: [] },
    ],
    summary: "Raj is the highest-priority lead with $5,200/month flowing to two competitor investment platforms (Sun Life RRSP + Manulife Securities), a TD mortgage ($3,200/mo), and $147K idle in chequing. As a high-income dentist and practice owner, he represents a comprehensive wealth management opportunity exceeding $400K in potential AUM.",
    detailedReasoning: "Raj Patel is a 52-year-old dentist and practice owner in Winnipeg with monthly practice income of $17,500. His transaction profile reveals one of the most significant competitor relationships in the portfolio:\n\n1. Sun Life Financial Group RRSP: $3,000/month ($36K/year) — likely an employer/corporate group RRSP arrangement\n2. Manulife Securities: $2,200/month ($26.4K/year) — separate individual investment account\n3. TD Mortgage: $3,200/month — suggests a ~$500K mortgage balance\n4. Sun Life Disability Insurance: $380/month — professional disability coverage\n\nCombined, $5,200/month ($62,400/year) is flowing to competitor investment platforms. At this contribution rate over several years, his accumulated investment assets at these competitors likely exceed $300-500K.\n\nCritically, $147,300 sits idle in his Wealthsimple chequing account — earning far less than it could in a managed portfolio or even high-interest savings. For a 52-year-old approaching retirement planning horizon, this represents significant opportunity cost.\n\nThe CRA tax installments of $8,500 quarterly confirm high income, and a recent $12,000 dental equipment purchase suggests active practice investment.\n\nRaj's profile is ideal for Wealthsimple's Generation tier ($500K+ AUM threshold) which includes dedicated advisory, comprehensive financial planning, and the Summit Portfolio.",
    recommendedActions: [
      { priority: 1, action: "Schedule comprehensive wealth review", rationale: "Combined competitor AUM likely exceeds $300-500K. Present Generation tier benefits: dedicated advisor, lower fees, Summit Portfolio access.", estimatedImpact: "$300-500K+ in AUM consolidation", requiresHumanApproval: true },
      { priority: 2, action: "Address idle chequing balance", rationale: "$147K in chequing is earning minimal return. Even a high-interest savings allocation would significantly improve yield.", estimatedImpact: "$147K deployed more productively", requiresHumanApproval: true },
      { priority: 3, action: "Discuss practice succession planning", rationale: "At 52 with a dental practice, Raj is approaching key succession planning decisions. Corporate investing, insurance review, and retirement timeline are interconnected.", estimatedImpact: "Comprehensive wealth relationship", requiresHumanApproval: true },
      { priority: 4, action: "Flag for mortgage product launch", rationale: "TD mortgage of $3,200/mo (~$500K balance) is another consolidation opportunity when lending launches.", estimatedImpact: "~$500K mortgage relationship", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Despite the strong signals, the advisor must determine: (1) Whether Raj's Sun Life Group RRSP is employer-sponsored with matching contributions that would be lost by leaving, (2) Whether his Manulife account contains segregated funds with insurance guarantees important for a practice owner, (3) His complete tax situation — as a dentist with a professional corporation, his financial structure may be more complex than transactions suggest, (4) His actual retirement timeline and risk tolerance, and (5) Whether he has a trusted accountant or financial advisor he's reluctant to change. The large idle balance may be intentional (planned practice expansion, equipment purchase, or tax payment reserve). Only a direct conversation can surface these critical factors.",
  },
  c007: {
    score: 64,
    confidence: "medium",
    signals: [
      { type: "competitor_rrsp", description: "$400/mo flowing to National Bank Direct (RRSP)", severity: "medium", estimatedValue: 4800, relatedTransactionIds: [] },
      { type: "income_change", description: "Income increased ~30% from job change ($2,800 → $3,654 per pay)", severity: "high", estimatedValue: 20496, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $1,600/mo to Urbandale Construction", severity: "medium", estimatedValue: 96000, relatedTransactionIds: [] },
      { type: "loan_ending", description: "Student loan payments ($320/mo) stopped — freed up $320/mo", severity: "low", estimatedValue: 3840, relatedTransactionIds: [] },
    ],
    summary: "Emily recently changed jobs (university to federal government) with a ~30% income increase, and her student loan payments have ended. These life transitions create a natural window for financial planning. She has a $400/mo RRSP at National Bank Direct.",
    detailedReasoning: "Emily's transaction history tells a clear life-transition story. For the first three months (Sep-Nov 2025), she received biweekly deposits of $2,800 from the University of Ottawa. Starting December, her deposits come from Treasury Board Canada at $3,654 biweekly — a ~30% income increase indicating a move from university employment to federal public service.\n\nSimultaneously, her NSLSC student loan payments of $320/month stopped appearing after December, indicating the loan has been fully repaid. Combined, she now has approximately $1,174/month in newly available income (salary increase + loan completion).\n\nHer existing $400/month RRSP contribution to National Bank Direct is modest relative to her new income. The Urbandale Construction mortgage at $1,600/month suggests a relatively recent home purchase in Ottawa.\n\nAt 29, with a new government job (strong job security, pension), rising income, and recently debt-free, Emily is at an ideal life stage for financial planning acceleration.",
    recommendedActions: [
      { priority: 1, action: "Discuss deploying freed-up income", rationale: "~$1,174/mo newly available from salary increase + loan completion. Prime moment for increasing investment contributions.", estimatedImpact: "~$14K/year in new contributions", requiresHumanApproval: true },
      { priority: 2, action: "Review RRSP vs TFSA vs FHSA allocation", rationale: "With government pension, TFSA may be more tax-efficient than additional RRSP. If she's a first-time buyer in a new city, FHSA is also relevant.", estimatedImpact: "Optimized tax-efficient saving strategy", requiresHumanApproval: true },
      { priority: 3, action: "Present National Bank fee comparison", rationale: "National Bank Direct RRSP likely has higher fees than Wealthsimple alternatives.", estimatedImpact: "~$4.8K/year AUM transfer", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must understand Emily's new government pension plan before recommending RRSP strategy — government DB pensions significantly affect optimal RRSP contribution levels and retirement planning. The mortgage with Urbandale Construction may be part of a new-build arrangement with specific terms. Her student loan completion may also mean she prioritizes other financial goals (travel, home improvements) over investment. A conversation about her priorities post-transition is essential before any product recommendation.",
  },
  c008: {
    score: 31,
    confidence: "low",
    signals: [
      { type: "competitor_tfsa", description: "$100/mo flowing to Questwealth Portfolios (TFSA)", severity: "low", estimatedValue: 1200, relatedTransactionIds: [] },
      { type: "loan_ending", description: "Student loan payments ($280/mo) appear to have ended", severity: "low", estimatedValue: 3360, relatedTransactionIds: [] },
    ],
    summary: "David is a graduate student with minimal income and a small $100/month TFSA at Questwealth. The low opportunity value and early career stage make this a long-term nurture lead rather than an immediate priority.",
    detailedReasoning: "David is a 24-year-old graduate student working as a TA at the University of Toronto ($1,100 biweekly). His financial profile is constrained: $850/month rent, small grocery and dining expenses, and a modest $100/month TFSA contribution to Questwealth Portfolios.\n\nThe notable signal is his student loan payments ($280/month to NSLSC) appearing to have stopped in January 2026, freeing up cash flow. However, his overall income and savings capacity remain limited.\n\nWith a chequing balance of only $4,200, David has minimal investable assets currently. His value is primarily as a long-term client who may become a high-earner after completing graduate studies.",
    recommendedActions: [
      { priority: 1, action: "Add to long-term nurture pipeline", rationale: "Post-graduation income jump will be the right moment for advisory engagement. Monitor for income changes.", estimatedImpact: "Future high-potential client", requiresHumanApproval: true },
      { priority: 2, action: "Suggest redirecting loan payment to TFSA", rationale: "Freed-up $280/mo from loan completion could increase TFSA contributions.", estimatedImpact: "~$3.4K/year in additional contributions", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Given David's early career stage and limited income, any advisory outreach must be sensitive to his financial constraints. The advisor must determine whether proactive outreach is appropriate for a student — aggressive financial product promotion to someone with $4,200 in savings could feel tone-deaf. Better to ensure Wealthsimple's digital experience retains him until his career and income mature.",
  },
  c009: {
    score: 75,
    confidence: "high",
    signals: [
      { type: "mortgage_refinance", description: "Mortgage payment of $2,100/mo to Scotiabank — likely approaching renewal", severity: "high", estimatedValue: 126000, relatedTransactionIds: [] },
      { type: "large_balance_idle", description: "$38,600 in chequing with zero investment activity detected", severity: "medium", estimatedValue: 38600, relatedTransactionIds: [] },
      { type: "life_event", description: "Large deposit of $25,000: estate transfer from M. Hassan", severity: "high", estimatedValue: 25000, relatedTransactionIds: [] },
    ],
    summary: "Fatima has a Scotiabank mortgage likely approaching renewal, zero investment activity despite a $125K income, and a recent $25K estate inheritance. She represents a strong 'blank slate' opportunity — high income, no competitor investments to consolidate, and a life event creating both liquidity and emotional openness to planning.",
    detailedReasoning: "Fatima is a 41-year-old pharmacist earning $125K (biweekly deposits of $4,808 from Shoppers Drug Mart). Her transaction profile is remarkable for what's MISSING: despite a substantial income, there are zero investment contributions to any institution — no RRSP, no TFSA, no managed funds.\n\nHer $2,100/month Scotiabank mortgage has been consistent for the full 6-month window. Given she's been a Wealthsimple client since September 2023, and mortgages typically renew every 5 years, her mortgage may be approaching a renewal window.\n\nThe most significant recent event is a $25,000 Interac e-Transfer labeled 'ESTATE OF M HASSAN' in November 2025 — likely an inheritance. This life event creates both investable capital and a natural emotional opening for financial planning conversations.\n\nCombining her $38,600 chequing balance + $25,000 inheritance + ongoing savings capacity from a $125K salary, Fatima has significant untapped potential.",
    recommendedActions: [
      { priority: 1, action: "Schedule initial investment planning conversation", rationale: "Zero investment activity + $125K income is the clearest 'blank slate' opportunity. She has never been approached about investing — this is entirely new AUM, not consolidation.", estimatedImpact: "New wealth relationship — potentially $20-40K/year in contributions", requiresHumanApproval: true },
      { priority: 2, action: "Discuss inheritance deployment", rationale: "The $25K estate transfer is a natural conversation trigger. Sensitive approach required given the personal nature of inheritances.", estimatedImpact: "$25K immediate investment opportunity", requiresHumanApproval: true },
      { priority: 3, action: "Flag for mortgage renewal outreach", rationale: "Scotiabank mortgage approaching potential renewal — opportunity when lending products launch.", estimatedImpact: "~$300K+ mortgage relationship", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The inheritance creates a particularly sensitive situation. The advisor must approach with empathy — 'ESTATE OF M HASSAN' likely indicates a family loss. While the $25K creates an investment opportunity, the timing and tone of outreach must prioritize the human relationship over the transaction. Additionally, the advisor must explore WHY Fatima has zero investments despite high income — she may have philosophical objections to investing, cultural preferences for cash savings, or financial obligations not visible in transactions (family support, etc.).",
  },
  c010: {
    score: 45,
    confidence: "medium",
    signals: [
      { type: "large_balance_idle", description: "$67,800 in chequing plus $1,500/mo to savings — zero investment products", severity: "high", estimatedValue: 67800, relatedTransactionIds: [] },
      { type: "spending_pattern", description: "High savings rate (~$1,500/mo) but all cash-based, no market exposure", severity: "medium", estimatedValue: 18000, relatedTransactionIds: [] },
    ],
    summary: "James has a strong savings habit ($1,500/month internal transfers) and $67K in his account, but zero investment products. Living in Yellowknife with a mining salary, he's a classic 'saver not investor' profile that needs education-first outreach.",
    detailedReasoning: "James works at Diavik Diamond Mines earning $3,769 biweekly (~$98K annually). He consistently transfers $1,500/month to what appears to be a Wealthsimple savings account ('WS SAVINGS TRANSFER'), demonstrating strong savings discipline.\n\nHis $67,800 chequing balance, combined with the regular savings transfers, suggests he has accumulated significant cash reserves — potentially $80-100K+ across accounts. However, there are zero investment contributions to any institution.\n\nLiving in Yellowknife, he has higher cost-of-living expenses (Northwestel $120/mo, NTPC utilities $250/mo, higher grocery costs at Independent Grocer). The $2,000/month Interac e-Transfer to a partner suggests shared household finances.\n\nAt 34, James has decades of potential investment growth ahead of him. The gap between his savings habit and his investment activity represents a significant education opportunity.",
    recommendedActions: [
      { priority: 1, action: "Initiate investment education outreach", rationale: "James saves $1,500/mo but doesn't invest. A gentle educational approach about market growth vs. savings interest could be transformative.", estimatedImpact: "$18K/year in new investment contributions", requiresHumanApproval: true },
      { priority: 2, action: "Suggest TFSA as first investment step", rationale: "TFSA is the easiest entry point — tax-free growth, accessible, no commitment to lock up funds.", estimatedImpact: "Up to $7K/year TFSA + catch-up room", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must understand why James chooses to save rather than invest. Possibilities include: risk aversion, lack of financial literacy, cultural attitudes toward markets, plan to use savings for a specific purpose (home purchase, relocation from Yellowknife, business), or simply not having been introduced to investing. The approach must be educational and respectful, not presumptuous. Remote/Northern communities may have different financial planning considerations (higher cost of living, rotational work patterns, housing challenges).",
  },
};

async function main() {
  console.log(`Generating analyses (${useMock ? "mock" : "Claude API"})...\n`);

  const clients = db.prepare("SELECT id FROM clients").all() as { id: string }[];

  const insertStmt = db.prepare(`
    INSERT INTO analyses (id, client_id, score, confidence, signals, summary, detailed_reasoning, recommended_actions, human_decision_required, analyzed_at, model_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET
      score = excluded.score,
      confidence = excluded.confidence,
      signals = excluded.signals,
      summary = excluded.summary,
      detailed_reasoning = excluded.detailed_reasoning,
      recommended_actions = excluded.recommended_actions,
      human_decision_required = excluded.human_decision_required,
      analyzed_at = excluded.analyzed_at,
      model_used = excluded.model_used
  `);

  for (const { id } of clients) {
    if (useMock) {
      const mock = MOCK_ANALYSES[id];
      if (!mock) {
        console.log(`  No mock analysis for ${id}, skipping`);
        continue;
      }

      insertStmt.run(
        `analysis_${id}`,
        id,
        mock.score,
        mock.confidence,
        JSON.stringify(mock.signals),
        mock.summary,
        mock.detailedReasoning,
        JSON.stringify(mock.recommendedActions),
        mock.humanDecisionRequired,
        new Date().toISOString(),
        "pre-generated-mock"
      );
      console.log(`  ${id}: score ${mock.score} (mock)`);
    } else {
      // Live Claude API analysis
      const { analyzeClient } = await import("../src/lib/ai/engine");

      const clientRow = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as Record<string, unknown>;
      const txnRows = db.prepare("SELECT * FROM transactions WHERE client_id = ?").all(id) as Record<string, unknown>[];

      const client = {
        id: clientRow.id as string,
        firstName: clientRow.first_name as string,
        lastName: clientRow.last_name as string,
        email: clientRow.email as string,
        age: clientRow.age as number,
        city: clientRow.city as string,
        province: clientRow.province as string,
        occupation: clientRow.occupation as string,
        annualIncome: clientRow.annual_income as number,
        accountOpenDate: clientRow.account_open_date as string,
        totalBalance: clientRow.total_balance as number,
        directDepositActive: Boolean(clientRow.direct_deposit_active),
      };

      const transactions = txnRows.map(t => ({
        id: t.id as string,
        clientId: t.client_id as string,
        date: t.date as string,
        amount: t.amount as number,
        description: t.description as string,
        category: t.category as string,
        merchantName: t.merchant_name as string,
        isRecurring: Boolean(t.is_recurring),
        type: t.type as string,
      }));

      try {
        const analysis = await analyzeClient(client as any, transactions as any);
        insertStmt.run(
          analysis.id,
          analysis.clientId,
          analysis.score,
          analysis.confidence,
          JSON.stringify(analysis.signals),
          analysis.summary,
          analysis.detailedReasoning,
          JSON.stringify(analysis.recommendedActions),
          analysis.humanDecisionRequired,
          analysis.analyzedAt,
          analysis.modelUsed
        );
        console.log(`  ${id}: score ${analysis.score} (Claude API)`);
      } catch (err) {
        console.error(`  ${id}: API error -`, err);
      }
    }
  }

  console.log("\nDone! All analyses generated.");
}

main();
