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
  // ── New Tier B leads ─────────────────────────────────────────────────
  c011: {
    score: 85,
    confidence: "high",
    signals: [
      { type: "competitor_rrsp", description: "$4,000/mo flowing to RBC Dominion Securities (RRSP)", severity: "high", estimatedValue: 48000, relatedTransactionIds: [] },
      { type: "competitor_tfsa", description: "$1,500/mo flowing to CI Investments (TFSA)", severity: "high", estimatedValue: 18000, relatedTransactionIds: [] },
      { type: "life_event", description: "RSU vest of $42,000 from Lululemon — new investable capital", severity: "high", estimatedValue: 42000, relatedTransactionIds: [] },
      { type: "large_balance_idle", description: "$185,000 in chequing with no Wealthsimple investment products", severity: "high", estimatedValue: 185000, relatedTransactionIds: [] },
    ],
    summary: "Naveen is a CFO with $5,500/month flowing to competitor investment platforms and $185K idle in chequing. A recent $42K RSU vesting creates additional investable capital. Strong wealth management consolidation candidate.",
    detailedReasoning: "Naveen Kapoor is a 48-year-old CFO at Lululemon Athletica earning approximately $280K annually. His transaction profile reveals substantial competitor investment relationships: $4,000/month to RBC Dominion Securities (RRSP) and $1,500/month to CI Investments (TFSA), totaling $66K/year in competitor contributions.\n\nThe recent $42,000 RSU vesting event creates an immediate investment conversation opportunity. Combined with his $185,000 idle chequing balance, Naveen has over $225K in immediately deployable capital.\n\nAs a CFO, he has strong financial literacy and will expect sophisticated investment solutions. His profile is ideal for Wealthsimple's Generation tier with dedicated advisory services.",
    recommendedActions: [
      { priority: 1, action: "Schedule comprehensive wealth review", rationale: "Combined competitor AUM likely exceeds $400K. Present Generation tier benefits with fee comparison vs RBC Dominion Securities.", estimatedImpact: "$400K+ in AUM consolidation potential", requiresHumanApproval: true },
      { priority: 2, action: "Discuss RSU vest deployment strategy", rationale: "$42K RSU vest is a natural conversation trigger for tax-efficient investment planning.", estimatedImpact: "$42K immediate investment + ongoing vesting schedule", requiresHumanApproval: true },
      { priority: 3, action: "Address idle chequing balance", rationale: "$185K earning minimal returns could be deployed in managed portfolio or high-interest savings.", estimatedImpact: "Significant yield improvement on idle cash", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must determine whether Naveen's RBC relationship includes employer-sponsored benefits through Lululemon, whether the CI Investments TFSA contains specific products with guarantees, and whether the idle balance is reserved for a specific purpose (property purchase, business venture). As a CFO, he may have strong opinions about investment management and fee structures.",
  },
  c012: {
    score: 78,
    confidence: "high",
    signals: [
      { type: "competitor_rrsp", description: "$3,500/mo flowing to National Bank Securities (RRSP)", severity: "high", estimatedValue: 42000, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$800/mo flowing to Fidelity Investments (TFSA)", severity: "medium", estimatedValue: 9600, relatedTransactionIds: [] },
      { type: "life_event", description: "Condo sale proceeds of $85,000 — significant new capital", severity: "high", estimatedValue: 85000, relatedTransactionIds: [] },
      { type: "income_change", description: "Senior corporate lawyer at Norton Rose with $220K income and $120K balance", severity: "medium", estimatedValue: 0, relatedTransactionIds: [] },
    ],
    summary: "Helene is a senior corporate lawyer with $4,300/month in competitor investments, $200K in her account, and a recent $85K condo sale creating new investable capital. Deeply entrenched in Quebec financial institutions but opportunity size is compelling.",
    detailedReasoning: "Helene Dufresne is a 55-year-old corporate lawyer at Norton Rose Fulbright in Montreal earning $220K. Her $3,500/month National Bank Securities RRSP and $800/month Fidelity TFSA represent $51.6K annually in competitor flows.\n\nThe $85,000 condo sale proceeds (via notary transfer) create an immediate deployment opportunity. At 55, she is entering the pre-retirement planning phase where consolidation and comprehensive financial planning become particularly valuable.\n\nQuebec clients often have strong institutional ties to Desjardins and National Bank. The approach must acknowledge this while presenting compelling alternatives.",
    recommendedActions: [
      { priority: 1, action: "Discuss condo sale proceeds deployment", rationale: "$85K in new capital needs a home. Pre-retirement planning conversation around tax-efficient growth.", estimatedImpact: "$85K immediate investment opportunity", requiresHumanApproval: true },
      { priority: 2, action: "Present RRSP consolidation analysis", rationale: "National Bank Securities fees vs Wealthsimple managed portfolios. At 55, fee drag matters more as retirement approaches.", estimatedImpact: "$42K/year AUM + accumulated balance", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must respect Quebec institutional preferences and determine if Helene's National Bank relationship has partnership benefits through Norton Rose. The condo sale proceeds may be earmarked for another property purchase. Pre-retirement advice carries heightened fiduciary responsibility.",
  },
  c013: {
    score: 88,
    confidence: "high",
    signals: [
      { type: "competitor_rrsp", description: "$5,000/mo flowing to CIBC Wood Gundy (RRSP)", severity: "high", estimatedValue: 60000, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$2,000/mo flowing to BMO InvestorLine (TFSA)", severity: "high", estimatedValue: 24000, relatedTransactionIds: [] },
      { type: "life_event", description: "Medical consulting income of $35,000 — new side revenue stream", severity: "high", estimatedValue: 35000, relatedTransactionIds: [] },
      { type: "large_balance_idle", description: "$210,000 in chequing with investment contributions at competitors only", severity: "high", estimatedValue: 210000, relatedTransactionIds: [] },
    ],
    summary: "Amit is a cardiologist with $7,000/month flowing to two competitor platforms and $210K idle in chequing. A recent $35K consulting fee creates additional capital. One of the highest-value prospects in the pipeline.",
    detailedReasoning: "Dr. Amit Sundaram is a 50-year-old cardiologist at Markham Stouffville Hospital earning $310K, with additional consulting income. His combined $7,000/month in competitor investment contributions ($60K/year to CIBC Wood Gundy RRSP + $24K/year to BMO InvestorLine TFSA) suggest accumulated competitor AUM potentially exceeding $500K.\n\nHis $210,000 idle chequing balance is the largest in the portfolio, combined with a $35,000 consulting fee, there is substantial capital to deploy. Medical professionals often value comprehensive wealth management with tax optimization for professional corporation structures.",
    recommendedActions: [
      { priority: 1, action: "Schedule Generation tier wealth review", rationale: "Combined competitor AUM likely exceeds $500K. Present dedicated advisory, Summit Portfolio access, and fee savings.", estimatedImpact: "$500K+ in AUM consolidation", requiresHumanApproval: true },
      { priority: 2, action: "Discuss professional corporation investing", rationale: "As a physician, corporate investing for retained earnings offers significant tax advantages.", estimatedImpact: "New corporate account + ongoing contributions", requiresHumanApproval: true },
      { priority: 3, action: "Address idle chequing balance", rationale: "$210K in chequing represents significant opportunity cost for a 50-year-old planning for retirement.", estimatedImpact: "$210K deployed to managed portfolio", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must understand Dr. Sundaram's full professional financial structure — physicians often have complex arrangements including professional corporations, buy-in obligations, and partnership agreements. The CIBC Wood Gundy relationship may include full-service advisory that he values. Medical consulting income may be seasonal or project-based.",
  },
  c014: {
    score: 83,
    confidence: "high",
    signals: [
      { type: "competitor_rrsp", description: "$3,500/mo flowing to Scotia iTRADE (RRSP)", severity: "high", estimatedValue: 42000, relatedTransactionIds: [] },
      { type: "competitor_tfsa", description: "$1,000/mo flowing to Questrade (TFSA)", severity: "medium", estimatedValue: 12000, relatedTransactionIds: [] },
      { type: "life_event", description: "Stock option exercise of $55,000 from Shopify", severity: "high", estimatedValue: 55000, relatedTransactionIds: [] },
      { type: "income_change", description: "VP-level compensation at Shopify with $250K income", severity: "medium", estimatedValue: 0, relatedTransactionIds: [] },
    ],
    summary: "Danielle is a VP of Engineering at Shopify with $4,500/month in competitor investments and a recent $55K stock option exercise. Her tech compensation structure likely includes ongoing equity that needs management.",
    detailedReasoning: "Danielle Fournier is a 44-year-old VP of Engineering at Shopify earning $250K with significant equity compensation. Her $3,500/month to Scotia iTRADE RRSP and $1,000/month to Questrade TFSA total $54K annually in competitor flows.\n\nThe $55,000 stock option exercise is a clear life event trigger. As a VP at a public company, she likely has ongoing equity vesting that creates recurring investment planning needs. Her $150,000 chequing balance adds to the opportunity.\n\nTech executives typically value low-fee, transparent investment platforms — Wealthsimple's positioning aligns well with this demographic.",
    recommendedActions: [
      { priority: 1, action: "Discuss equity compensation planning", rationale: "Stock option exercise of $55K suggests ongoing equity grants that need tax-efficient management.", estimatedImpact: "$55K+ per vesting cycle", requiresHumanApproval: true },
      { priority: 2, action: "Present fee comparison vs Scotia iTRADE", rationale: "Self-directed platforms like Scotia iTRADE may not optimize her portfolio for tax efficiency.", estimatedImpact: "$42K/year AUM consolidation", requiresHumanApproval: true },
      { priority: 3, action: "Explore FHSA eligibility", rationale: "If first-time homebuyer in Ottawa, FHSA offers additional tax-advantaged savings.", estimatedImpact: "Up to $8K/year in new contributions", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must determine Danielle's specific Shopify equity plan structure, whether she has an existing financial advisor relationship, and whether she prefers self-directed investing (given her Questrade account). The stock option tax implications may be complex and require coordination with her accountant.",
  },
  c015: {
    score: 76,
    confidence: "medium",
    signals: [
      { type: "competitor_rrsp", description: "$2,500/mo flowing to RBC Direct Investing (RRSP)", severity: "high", estimatedValue: 30000, relatedTransactionIds: [] },
      { type: "life_event", description: "Large client contract payment of $28,000", severity: "high", estimatedValue: 28000, relatedTransactionIds: [] },
      { type: "income_change", description: "Business revenue of $12K-$18K/mo with strong growth trajectory", severity: "medium", estimatedValue: 0, relatedTransactionIds: [] },
      { type: "large_balance_idle", description: "$95,000 in chequing — potential business operating reserve", severity: "medium", estimatedValue: 95000, relatedTransactionIds: [] },
    ],
    summary: "Wei is a tech business owner with $2,500/month flowing to RBC RRSP, variable business income, and $95K in chequing. A recent $28K contract payment signals business growth. Strong candidate for corporate investment solutions.",
    detailedReasoning: "Wei Chen is a 42-year-old business owner (Chen Tech Solutions Inc.) in Markham earning ~$180K. His business generates $12K-$18K monthly, showing healthy variability. The $2,500/month RBC RRSP contribution represents his primary investment activity.\n\nThe $28,000 contract payment from CIBC Commercial suggests enterprise-level clients and growing revenue. His $95,000 chequing balance may serve as business operating reserve but could partially be deployed to investment products.\n\nAs a business owner with significant operating expenses ($3,500/mo AWS, $2,800/mo office lease), he needs solutions that balance business cash needs with long-term wealth building.",
    recommendedActions: [
      { priority: 1, action: "Discuss corporate investment account", rationale: "As a tech business owner, retained earnings in a corporate investment account offer tax deferral advantages.", estimatedImpact: "New corporate account + $30K+ annual contributions", requiresHumanApproval: true },
      { priority: 2, action: "Present RBC RRSP fee comparison", rationale: "$30K/year in competitor RRSP contributions could benefit from lower fees.", estimatedImpact: "$30K/year AUM transfer", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must understand Wei's business cash flow needs, whether the $95K balance is needed for operations, and whether he has an accountant managing his corporate tax structure. Small business owners often need flexible solutions that accommodate irregular income patterns.",
  },
  c016: {
    score: 72,
    confidence: "medium",
    signals: [
      { type: "competitor_rrsp", description: "$2,000/mo flowing to TD Waterhouse (RRSP)", severity: "high", estimatedValue: 24000, relatedTransactionIds: [] },
      { type: "life_event", description: "Equipment sale proceeds of $18,000", severity: "high", estimatedValue: 18000, relatedTransactionIds: [] },
      { type: "income_change", description: "Design studio revenue of $10K-$15K/mo showing stability", severity: "medium", estimatedValue: 0, relatedTransactionIds: [] },
      { type: "spending_pattern", description: "High business expenses ($2K+/mo on creative tools) signal established operation", severity: "low", estimatedValue: 0, relatedTransactionIds: [] },
    ],
    summary: "Yuki is an entrepreneur running a design studio in Calgary with $2,000/month flowing to TD Waterhouse RRSP. A recent $18K equipment sale creates new capital. Emerging wealth management opportunity as her business matures.",
    detailedReasoning: "Yuki Tanaka is a 39-year-old entrepreneur running Tanaka Design Studio in Calgary. Her business generates $10K-$15K monthly with substantial creative tool expenses (Adobe, etc.). The $2,000/month TD Waterhouse RRSP is her primary investment vehicle.\n\nThe $18,000 equipment sale proceeds create immediate investable capital. At 39 with $80K in chequing and a growing business, she is entering the wealth accumulation phase where proper financial planning can compound significantly.\n\nManulife business insurance ($245/mo) indicates she has some professional financial relationships. CRA tax installments of $4,500 quarterly confirm solid business income.",
    recommendedActions: [
      { priority: 1, action: "Discuss deploying equipment sale proceeds", rationale: "$18K in new capital needs a tax-efficient home. RRSP catch-up or TFSA contribution.", estimatedImpact: "$18K immediate investment", requiresHumanApproval: true },
      { priority: 2, action: "Review corporate vs personal investment structure", rationale: "As business matures, separating personal and corporate investing optimizes tax position.", estimatedImpact: "New corporate account opportunity", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must understand Yuki's business growth plans — the equipment sale may indicate a pivot or restructuring. Entrepreneurs often prioritize business reinvestment over personal investing. The TD Waterhouse relationship may be tied to a business banking package.",
  },
  c017: {
    score: 80,
    confidence: "high",
    signals: [
      { type: "competitor_rrsp", description: "$3,000/mo flowing to CIBC Investor's Edge (RRSP)", severity: "high", estimatedValue: 36000, relatedTransactionIds: [] },
      { type: "competitor_tfsa", description: "$1,000/mo flowing to Scotiabank (TFSA)", severity: "medium", estimatedValue: 12000, relatedTransactionIds: [] },
      { type: "life_event", description: "Government contract payment of $45,000 — major business win", severity: "high", estimatedValue: 45000, relatedTransactionIds: [] },
      { type: "income_change", description: "Logistics business revenue of $14K-$20K/mo with government contracts", severity: "high", estimatedValue: 0, relatedTransactionIds: [] },
    ],
    summary: "Tariq is a logistics business founder with $4,000/month in competitor investments and a recent $45K government contract. Strong business growth trajectory with enterprise clients makes him a prime candidate for corporate wealth solutions.",
    detailedReasoning: "Tariq Al-Rashid is a 46-year-old Founder & CEO of Rashid Logistics Inc. in Mississauga. His business generates $14K-$20K monthly, with a significant $45,000 government contract payment indicating enterprise-level operations.\n\nHis combined $4,000/month in investment contributions ($36K/year to CIBC Investor's Edge RRSP + $12K/year to Scotiabank TFSA) represent substantial wealth building. Fleet expenses of $3K-$4K/month and commercial insurance of $520/month indicate a well-established logistics operation.\n\nWith $110,000 in chequing and CRA installments of $7,000 quarterly, Tariq has significant capital and income that would benefit from comprehensive wealth management.",
    recommendedActions: [
      { priority: 1, action: "Schedule corporate wealth planning session", rationale: "Combined personal investment flow of $48K/year plus business cash reserves need coordinated planning.", estimatedImpact: "$48K/year AUM + corporate account", requiresHumanApproval: true },
      { priority: 2, action: "Discuss government contract revenue management", rationale: "Lumpy government payments create cash management opportunities between contracts.", estimatedImpact: "Improved cash deployment strategy", requiresHumanApproval: true },
      { priority: 3, action: "Present consolidated investment platform", rationale: "Currently split between CIBC and Scotiabank — consolidation simplifies and reduces fees.", estimatedImpact: "$48K/year AUM consolidation", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must understand Tariq's business expansion plans, whether the government contracts create specific bonding or insurance requirements, and how his personal and corporate finances interact. Logistics businesses may have specific capital requirements for fleet expansion or warehousing that affect investable surplus.",
  },
  c018: {
    score: 74,
    confidence: "high",
    signals: [
      { type: "mortgage_refinance", description: "TD mortgage at $1,850/mo — potential renewal opportunity", severity: "high", estimatedValue: 111000, relatedTransactionIds: [] },
      { type: "competitor_rrsp", description: "$800/mo flowing to Questrade (RRSP)", severity: "medium", estimatedValue: 9600, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$400/mo flowing to TD Direct Investing (TFSA)", severity: "medium", estimatedValue: 4800, relatedTransactionIds: [] },
      { type: "life_event", description: "Annual bonus of $15,000 from employer", severity: "high", estimatedValue: 15000, relatedTransactionIds: [] },
    ],
    summary: "Sophie has a TD mortgage approaching potential renewal, $1,200/month in competitor investments, and a $15K bonus creating new capital. As a 33-year-old product manager, she is in peak wealth accumulation phase with growing income.",
    detailedReasoning: "Sophie Bergeron is a 33-year-old Product Manager at Communitech Hub in Kitchener earning $105K. Her TD mortgage at $1,850/month is the primary financial relationship, supplemented by $800/month Questrade RRSP and $400/month TD Direct Investing TFSA.\n\nThe $15,000 annual bonus creates a natural investment planning conversation. At 33 with $45K in chequing, she is building wealth at an accelerating pace. The Kitchener-Waterloo tech corridor offers strong career growth potential.\n\nHer mortgage with TD combined with a TD TFSA suggests an entrenched TD relationship, but the Questrade RRSP shows willingness to explore alternatives.",
    recommendedActions: [
      { priority: 1, action: "Discuss bonus deployment strategy", rationale: "$15K bonus needs a plan — RRSP top-up, TFSA catch-up, or mortgage prepayment.", estimatedImpact: "$15K immediate investment opportunity", requiresHumanApproval: true },
      { priority: 2, action: "Flag for mortgage product outreach", rationale: "TD mortgage renewal will be a key decision point for consolidation.", estimatedImpact: "~$280K mortgage relationship", requiresHumanApproval: true },
      { priority: 3, action: "Present investment consolidation benefits", rationale: "Split between Questrade and TD — consolidation simplifies tracking and potentially reduces fees.", estimatedImpact: "$14.4K/year AUM consolidation", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must determine Sophie's mortgage renewal timing, whether TD offers her bundled pricing on mortgage + investments, and whether the bonus is recurring or one-time. Young professionals in tech may prioritize stock options or startup equity over traditional investment products.",
  },
  c019: {
    score: 77,
    confidence: "high",
    signals: [
      { type: "mortgage_refinance", description: "Scotiabank mortgage at $2,100/mo — renewal opportunity", severity: "high", estimatedValue: 126000, relatedTransactionIds: [] },
      { type: "competitor_rrsp", description: "$1,200/mo flowing to RBC Direct Investing (RRSP)", severity: "high", estimatedValue: 14400, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$500/mo flowing to BMO InvestorLine (TFSA)", severity: "medium", estimatedValue: 6000, relatedTransactionIds: [] },
      { type: "life_event", description: "Inheritance of $32,000 from estate of P. O'Brien", severity: "high", estimatedValue: 32000, relatedTransactionIds: [] },
    ],
    summary: "Michael has a Scotiabank mortgage, $1,700/month in competitor investments across RBC and BMO, and a recent $32K inheritance. The life event combined with mortgage renewal timing creates a strong multi-product conversation opportunity.",
    detailedReasoning: "Michael O'Brien is a 37-year-old Civil Engineer at Aecon Group in Edmonton earning $115K. His Scotiabank mortgage at $2,100/month is the primary relationship, with investment contributions split between RBC Direct Investing ($1,200/month RRSP) and BMO InvestorLine ($500/month TFSA).\n\nThe $32,000 inheritance (estate of P. O'Brien) is a sensitive life event that creates both investable capital and an emotional opening for comprehensive financial planning. At 37 with $55K in chequing plus the inheritance, he has meaningful capital to deploy.\n\nThe split across three financial institutions (Scotiabank, RBC, BMO) indicates no single deep relationship — making consolidation more feasible.",
    recommendedActions: [
      { priority: 1, action: "Discuss inheritance planning", rationale: "$32K inheritance needs thoughtful deployment. Life event creates natural advisory conversation.", estimatedImpact: "$32K immediate investment", requiresHumanApproval: true },
      { priority: 2, action: "Present consolidation across three institutions", rationale: "Currently split across Scotiabank, RBC, and BMO — consolidation simplifies and may reduce fees.", estimatedImpact: "$20.4K/year AUM + mortgage relationship", requiresHumanApproval: true },
      { priority: 3, action: "Flag for mortgage product outreach", rationale: "Scotiabank mortgage renewal is a consolidation catalyst.", estimatedImpact: "~$320K mortgage relationship", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The inheritance is a sensitive topic requiring empathetic outreach. The advisor must also determine if Michael's Aecon employment includes any group RRSP arrangements through RBC, and whether his multi-institution approach is intentional diversification or inertia. Alberta's energy sector volatility may affect his risk tolerance and job security outlook.",
  },
  c020: {
    score: 68,
    confidence: "medium",
    signals: [
      { type: "competitor_tfsa", description: "$500/mo flowing to Scotiabank (TFSA)", severity: "medium", estimatedValue: 6000, relatedTransactionIds: [] },
      { type: "competitor_rrsp", description: "$300/mo flowing to TD Direct Investing (RRSP)", severity: "medium", estimatedValue: 3600, relatedTransactionIds: [] },
      { type: "life_event", description: "Signing bonus of $12,000 from new position at Wawanesa", severity: "high", estimatedValue: 12000, relatedTransactionIds: [] },
      { type: "income_change", description: "New job at Wawanesa Insurance with $72K salary — career growth signal", severity: "medium", estimatedValue: 0, relatedTransactionIds: [] },
    ],
    summary: "Amara recently started a new role at Wawanesa with a $12K signing bonus, and has $800/month in competitor investments. As a 30-year-old early in her wealth accumulation journey, she represents a high-potential long-term relationship.",
    detailedReasoning: "Amara Diallo is a 30-year-old Marketing Manager who recently joined Wawanesa Mutual Insurance in Winnipeg at $72K. The $12,000 signing bonus signals career momentum and creates immediate investable capital.\n\nHer $500/month Scotiabank TFSA and $300/month TD RRSP show established investing habits despite modest income. At 30 with $28K in chequing, she is in the early stages of wealth building with decades of compounding ahead.\n\nThe new job transition is an optimal time for financial planning conversations — she may be reviewing all her financial arrangements as part of the life change.",
    recommendedActions: [
      { priority: 1, action: "Discuss signing bonus deployment", rationale: "$12K signing bonus is unallocated capital. Perfect entry point for TFSA top-up or emergency fund.", estimatedImpact: "$12K immediate investment", requiresHumanApproval: true },
      { priority: 2, action: "Present investment consolidation", rationale: "Currently split between Scotiabank and TD — consolidation at Wealthsimple simplifies at lower fees.", estimatedImpact: "$9.6K/year AUM consolidation", requiresHumanApproval: true },
      { priority: 3, action: "Discuss employer benefits optimization", rationale: "New employer may offer group RRSP, pension, or insurance — coordinate personal investments accordingly.", estimatedImpact: "Optimized overall savings strategy", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "The advisor must determine if Wawanesa offers group benefits that affect her personal investment strategy, whether the signing bonus has any clawback conditions, and her financial priorities at this life stage (travel, debt repayment, home savings). Early-career clients need nurturing not aggressive product pushing.",
  },
  c021: {
    score: 72,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$1,200/mo flowing to RBC Direct Investing (TFSA)", severity: "high", estimatedValue: 14400, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $2,800/mo to Scotiabank", severity: "high", estimatedValue: 168000, relatedTransactionIds: [] },
    ],
    summary: "Liam is a marketing director with $1,200/mo to RBC TFSA and a Scotiabank mortgage. Realty partner referral — recent home purchase creates a natural window for full financial planning.",
    detailedReasoning: "Liam Morrison was referred through a realty partner, suggesting a recent or upcoming home purchase. His $2,800/mo Scotiabank mortgage is the dominant outflow. The $1,200/mo RBC TFSA contribution shows active investing discipline.\n\nAt 35 with $130K income, he is in a prime wealth-building phase. The realty partner relationship provides a warm introduction context.",
    recommendedActions: [
      { priority: 1, action: "Schedule investment consolidation review", rationale: "RBC TFSA can be consolidated at lower fees. Use realty partner introduction as warm entry.", estimatedImpact: "$14.4K/year AUM", requiresHumanApproval: true },
      { priority: 2, action: "Flag for mortgage renewal outreach", rationale: "Scotiabank mortgage represents significant lending opportunity at renewal.", estimatedImpact: "$400K+ mortgage opportunity", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Verify realty partner relationship details and whether the mortgage is newly originated (making refinance less attractive short-term).",
  },
  c022: {
    score: 65,
    confidence: "medium",
    signals: [
      { type: "competitor_rrsp", description: "$800/mo flowing to National Bank (RRSP)", severity: "medium", estimatedValue: 9600, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $2,200/mo to Desjardins", severity: "high", estimatedValue: 132000, relatedTransactionIds: [] },
    ],
    summary: "Nadia is an architect in Laval with a Desjardins mortgage and National Bank RRSP. Quebec-based clients often have deep institutional ties. Realty partner referral.",
    detailedReasoning: "Nadia Bouchard has a $2,200/mo Desjardins mortgage and $800/mo National Bank RRSP. At 41 with $115K income, she has solid savings habits. Quebec clients often have long-standing Desjardins relationships that require a compelling case to move.",
    recommendedActions: [
      { priority: 1, action: "Present fee comparison vs National Bank", rationale: "National Bank typically charges higher MERs on managed funds.", estimatedImpact: "$9.6K/year AUM", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Assess strength of existing Desjardins/National Bank ties and whether Quebec-specific products factor into her decision.",
  },
  c023: {
    score: 55,
    confidence: "medium",
    signals: [
      { type: "competitor_tfsa", description: "$500/mo flowing to TD Direct Investing (TFSA)", severity: "medium", estimatedValue: 6000, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $1,800/mo to TD Bank", severity: "medium", estimatedValue: 108000, relatedTransactionIds: [] },
      { type: "spending_pattern", description: "Irregular commission income ($6K-$10K/mo) suggests cash flow management needs", severity: "low", estimatedValue: 0, relatedTransactionIds: [] },
    ],
    summary: "Derek is a real estate agent with variable commission income, a TD mortgage, and TD TFSA. His irregular income pattern suggests cash management and investment timing opportunities.",
    detailedReasoning: "As a real estate agent, Derek has variable monthly income. His TD relationship spans both mortgage and investment, creating entrenchment but also a single consolidation target. At 29, he's early in wealth building.",
    recommendedActions: [
      { priority: 1, action: "Discuss cash flow management strategy", rationale: "Variable income creates opportunity for smart savings timing and high-interest holding.", estimatedImpact: "Improved cash utilization", requiresHumanApproval: true },
      { priority: 2, action: "Present TD TFSA fee comparison", rationale: "TD Direct Investing charges commission on trades. Wealthsimple offers commission-free.", estimatedImpact: "$6K/year AUM", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Verify income stability and whether real estate market conditions affect his financial planning timeline.",
  },
  c024: {
    score: 78,
    confidence: "high",
    signals: [
      { type: "competitor_rrsp", description: "$1,500/mo flowing to Desjardins Securities (RRSP)", severity: "high", estimatedValue: 18000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $200/mo to Industrial Alliance", severity: "low", estimatedValue: 2400, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $2,600/mo to CIBC", severity: "high", estimatedValue: 156000, relatedTransactionIds: [] },
    ],
    summary: "Christine is a senior government director with strong income stability. $1,500/mo RRSP at Desjardins and a CIBC mortgage represent significant consolidation opportunities. Referred through realty partner.",
    detailedReasoning: "At 52 with $145K government income, Christine has excellent job stability and is approaching peak earning/saving years before retirement. Her $1,500/mo Desjardins RRSP and $2,600/mo CIBC mortgage are the primary opportunities. Government pension will supplement retirement, making RRSP strategy particularly important.",
    recommendedActions: [
      { priority: 1, action: "Schedule retirement planning review", rationale: "At 52 with government pension, RRSP strategy optimization is critical for retirement.", estimatedImpact: "$18K/year AUM + accumulated balance", requiresHumanApproval: true },
      { priority: 2, action: "Review mortgage renewal timeline", rationale: "CIBC mortgage renewal is a natural consolidation moment.", estimatedImpact: "$400K+ mortgage", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Assess government pension details and whether RRSP contributions are optimal given defined benefit pension.",
  },
  c025: {
    score: 74,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$1,800/mo flowing to HSBC InvestDirect (RRSP)", severity: "high", estimatedValue: 21600, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $2,400/mo to BMO", severity: "high", estimatedValue: 144000, relatedTransactionIds: [] },
    ],
    summary: "Vikram is an IT consultant with $1,800/mo flowing to HSBC InvestDirect. With HSBC exiting Canadian retail banking, this is an ideal consolidation moment.",
    detailedReasoning: "Vikram Mehta has $1,800/mo to HSBC InvestDirect for RRSP — with HSBC's reduced Canadian retail presence, clients may be seeking alternatives. His BMO mortgage of $2,400/mo is a secondary opportunity. At 44 with $140K income, he's in prime accumulation phase.",
    recommendedActions: [
      { priority: 1, action: "Proactive HSBC client outreach", rationale: "HSBC's reduced Canadian presence creates natural migration opportunity.", estimatedImpact: "$21.6K/year AUM + accumulated balance", requiresHumanApproval: true },
      { priority: 2, action: "Bundle BMO mortgage at renewal", rationale: "Full financial consolidation pitch including investment + mortgage.", estimatedImpact: "$350K+ mortgage", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Confirm HSBC account status and whether existing HSBC clients are being transitioned to another institution.",
  },
  c026: {
    score: 58,
    confidence: "medium",
    signals: [
      { type: "competitor_tfsa", description: "$800/mo flowing to Questrade (TFSA)", severity: "medium", estimatedValue: 9600, relatedTransactionIds: [] },
      { type: "competitor_rrsp", description: "$600/mo flowing to Questrade (RRSP)", severity: "medium", estimatedValue: 7200, relatedTransactionIds: [] },
    ],
    summary: "Jessica is a UX designer investing $1,400/mo through Questrade. As a tech-savvy professional, she likely chose Questrade for low fees — Wealthsimple's commission-free trading is a direct competitor.",
    detailedReasoning: "Jessica Fong is a 31-year-old UX designer making $105K. Her $1,400/mo combined Questrade contributions show active investing. Marketing campaign lead — she's already aware of alternatives.",
    recommendedActions: [
      { priority: 1, action: "Present Wealthsimple vs Questrade comparison", rationale: "Commission-free trading + managed portfolio option differentiates from Questrade's DIY-only approach.", estimatedImpact: "$16.8K/year AUM", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Questrade users are typically cost-conscious DIY investors. Verify that Wealthsimple's offering genuinely provides more value than her current setup.",
  },
  c027: {
    score: 52,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$400/mo flowing to CIBC Investors Edge (TFSA)", severity: "medium", estimatedValue: 4800, relatedTransactionIds: [] },
      { type: "mortgage_refinance", description: "Mortgage payment of $1,950/mo to RBC", severity: "medium", estimatedValue: 117000, relatedTransactionIds: [] },
    ],
    summary: "Omar has modest CIBC investment contributions and an RBC mortgage. Marketing campaign lead with moderate opportunity.",
    detailedReasoning: "Omar Mansour is a logistics manager at $88K. His $400/mo CIBC TFSA and $1,950/mo RBC mortgage represent split banking relationships. Moderate income limits aggressive consolidation pitch.",
    recommendedActions: [
      { priority: 1, action: "Present fee comparison on CIBC TFSA", rationale: "CIBC Investors Edge charges $6.95/trade. Wealthsimple offers commission-free.", estimatedImpact: "$4.8K/year AUM", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Assess whether Omar's split banking is intentional or just legacy. Lower income means consolidation savings may not be as compelling.",
  },
  c028: {
    score: 66,
    confidence: "medium",
    signals: [
      { type: "competitor_rrsp", description: "$1,500/mo flowing to Scotiabank (RRSP)", severity: "high", estimatedValue: 18000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $350/mo to Manulife", severity: "medium", estimatedValue: 4200, relatedTransactionIds: [] },
    ],
    summary: "Rachel is a veterinarian with $1,500/mo Scotia RRSP and Manulife insurance. Professional income and age (47) suggest significant accumulated investments.",
    detailedReasoning: "At 47 with $135K income, Rachel has likely built significant RRSP balance over years of $1,500/mo contributions. Manulife insurance of $350/mo is substantial, suggesting comprehensive coverage. Marketing campaign lead.",
    recommendedActions: [
      { priority: 1, action: "Present Scotia RRSP fee comparison", rationale: "Scotia mutual funds often carry 2%+ MER. Fee savings compound significantly on accumulated balance.", estimatedImpact: "$18K/year AUM + large accumulated balance", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Verify total accumulated RRSP balance — years of $1,500/mo contributions could mean $300K+ in assets making fee comparison very compelling.",
  },
  c029: {
    score: 62,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$1,000/mo flowing to Interactive Brokers (RRSP)", severity: "high", estimatedValue: 12000, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$500/mo flowing to Interactive Brokers (TFSA)", severity: "medium", estimatedValue: 6000, relatedTransactionIds: [] },
    ],
    summary: "Pavel is a data scientist investing $1,500/mo through Interactive Brokers. As a sophisticated investor, he'll require a strong product and fee argument.",
    detailedReasoning: "Interactive Brokers users are typically sophisticated, cost-conscious investors. Pavel's $125K income and tech background suggest he actively manages his portfolio. The pitch needs to be product-quality focused, not just fee-based.",
    recommendedActions: [
      { priority: 1, action: "Highlight unique Wealthsimple features", rationale: "FHSA, tax-loss harvesting, and integrated platform may appeal to a sophisticated investor.", estimatedImpact: "$18K/year AUM", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Interactive Brokers users are highly informed — verify that switching would genuinely benefit Pavel's specific investment strategy.",
  },
  c030: {
    score: 70,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$2,000/mo flowing to BMO InvestorLine (RRSP)", severity: "high", estimatedValue: 24000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $250/mo to Pacific Blue Cross", severity: "low", estimatedValue: 3000, relatedTransactionIds: [] },
    ],
    summary: "Maya is a school principal approaching retirement with $2,000/mo to BMO InvestorLine. At 56 with likely substantial accumulated investments, fee optimization is very impactful.",
    detailedReasoning: "At 56 with $110K income, Maya has approximately 9 years to retirement. Her $2,000/mo BMO RRSP contributions over years likely mean a significant accumulated balance. Fee reduction on existing assets could save thousands annually.",
    recommendedActions: [
      { priority: 1, action: "Schedule retirement planning consultation", rationale: "Pre-retirement review is critical. BMO fund fees on accumulated balance create compelling savings case.", estimatedImpact: "$24K/year AUM + large accumulated balance", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Assess teacher pension and how it interacts with RRSP strategy. BC teachers have strong defined benefit pensions.",
  },
  c031: {
    score: 48,
    confidence: "medium",
    signals: [
      { type: "competitor_rrsp", description: "$500/mo flowing to TD Direct Investing (RRSP)", severity: "medium", estimatedValue: 6000, relatedTransactionIds: [] },
    ],
    summary: "Hannah is a young mechanical engineer with modest $500/mo TD RRSP. Early-career referral lead with long-term relationship potential.",
    detailedReasoning: "At 28 with $92K income, Hannah is early in her career and investing journey. The $500/mo TD RRSP is her only detected competitive relationship. Long-term potential is high but immediate value is modest.",
    recommendedActions: [
      { priority: 1, action: "Present holistic investment plan", rationale: "Young professional open to new relationships. Show TFSA + RRSP + FHSA optimization.", estimatedImpact: "$6K/year AUM + growth potential", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Assess life stage priorities — home savings, student loans, travel — before pushing investment consolidation.",
  },
  c032: {
    score: 79,
    confidence: "high",
    signals: [
      { type: "competitor_investment", description: "$2,500/mo flowing to RBC Dominion Securities (RRSP)", severity: "high", estimatedValue: 30000, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$800/mo flowing to RBC Direct Investing (TFSA)", severity: "medium", estimatedValue: 9600, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $380/mo to Sun Life Financial", severity: "medium", estimatedValue: 4560, relatedTransactionIds: [] },
    ],
    summary: "Jaspreet is an optometrist with $3,300/mo flowing to RBC investments plus Sun Life insurance. Strong referral lead with high-value consolidation opportunity.",
    detailedReasoning: "Jaspreet Gill has a concentrated RBC investment relationship — $2,500/mo RRSP at Dominion Securities and $800/mo TFSA at RBC Direct. At 43 with $165K income, accumulated balances are likely substantial. Sun Life insurance of $380/mo adds to the financial product landscape. Referred by existing client.",
    recommendedActions: [
      { priority: 1, action: "Schedule comprehensive portfolio review", rationale: "RBC Dominion Securities charges 1-1.5% management. Wealthsimple's lower fees on accumulated balance is compelling.", estimatedImpact: "$39.6K/year AUM + accumulated balance", requiresHumanApproval: true },
      { priority: 2, action: "Review insurance optimization", rationale: "$380/mo insurance may be optimizable.", estimatedImpact: "Cross-sell opportunity", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Verify whether RBC Dominion Securities provides personalized advice that justifies higher fees — some clients value advisor relationships.",
  },
  c033: {
    score: 71,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$1,500/mo flowing to Desjardins Courtage (RRSP)", severity: "high", estimatedValue: 18000, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$700/mo flowing to Desjardins Courtage (TFSA)", severity: "medium", estimatedValue: 8400, relatedTransactionIds: [] },
    ],
    summary: "Thomas is a software architect in Quebec City with $2,200/mo flowing to Desjardins investments. Referred by existing client — Quebec institutional loyalty is a consideration.",
    detailedReasoning: "Thomas has a deep Desjardins relationship typical of Quebec professionals. Combined $2,200/mo in Desjardins investments at 36 with $145K income represents strong accumulation. Referral lead provides warm introduction.",
    recommendedActions: [
      { priority: 1, action: "Present fee comparison vs Desjardins Courtage", rationale: "Desjardins management fees are typically higher than Wealthsimple.", estimatedImpact: "$26.4K/year AUM", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Quebec clients may have cultural/institutional ties to Desjardins. Assess whether consolidation is genuinely in Thomas's interest.",
  },
  c034: {
    score: 85,
    confidence: "high",
    signals: [
      { type: "competitor_investment", description: "$3,000/mo flowing to CIBC Wood Gundy (RRSP)", severity: "high", estimatedValue: 36000, relatedTransactionIds: [] },
      { type: "competitor_tfsa", description: "$1,500/mo flowing to CIBC Wood Gundy (TFSA)", severity: "high", estimatedValue: 18000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $450/mo to Great-West Life", severity: "medium", estimatedValue: 5400, relatedTransactionIds: [] },
    ],
    summary: "Diana is a clinic owner with $4,500/mo flowing to CIBC Wood Gundy investments. Highest-value external referral lead with significant accumulated wealth likely in the $500K+ range.",
    detailedReasoning: "Diana Reyes runs a medical clinic and at 50 with $195K income has likely built substantial wealth. Her $4,500/mo combined CIBC Wood Gundy contributions represent the largest competitor investment flow among external leads. Great-West Life insurance adds to the financial complexity. Referred by existing client.",
    recommendedActions: [
      { priority: 1, action: "Schedule wealth management consultation", rationale: "CIBC Wood Gundy charges 1-2% management. Fee savings on $500K+ portfolio would be thousands annually.", estimatedImpact: "$54K/year AUM + $500K+ accumulated", requiresHumanApproval: true },
      { priority: 2, action: "Explore corporate investment structure", rationale: "As clinic owner, may benefit from corporate investment account.", estimatedImpact: "New corporate account", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "CIBC Wood Gundy provides full-service advice. Verify Diana would get equivalent or better service, not just lower fees.",
  },
  c035: {
    score: 42,
    confidence: "low",
    signals: [
      { type: "competitor_tfsa", description: "$500/mo flowing to Questrade (TFSA)", severity: "low", estimatedValue: 6000, relatedTransactionIds: [] },
      { type: "spending_pattern", description: "Irregular startup income ($4K-$8K/mo) suggests cash flow management needs", severity: "medium", estimatedValue: 0, relatedTransactionIds: [] },
    ],
    summary: "Kevin is a startup founder with variable income and modest $500/mo Questrade TFSA. Early-stage entrepreneur — focus on cash management over investment consolidation.",
    detailedReasoning: "At 27 with a startup, Kevin's income is variable and relatively low. His $500/mo Questrade TFSA is modest. The primary value is long-term relationship building as his startup grows.",
    recommendedActions: [
      { priority: 1, action: "Discuss high-interest savings for variable income", rationale: "Wealthsimple Cash offers competitive interest for parking variable income.", estimatedImpact: "Cash account opening", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Startup founders have unpredictable financial trajectories. Do not recommend aggressive investing given income variability.",
  },
  c036: {
    score: 63,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$1,200/mo flowing to TD Waterhouse (RRSP)", severity: "high", estimatedValue: 14400, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $280/mo to Canada Life", severity: "low", estimatedValue: 3360, relatedTransactionIds: [] },
    ],
    summary: "Alicia is a nurse practitioner with $1,200/mo TD Waterhouse RRSP. Healthcare professional referral with solid income stability.",
    detailedReasoning: "Alicia has stable healthcare sector income at $108K. Her $1,200/mo TD Waterhouse RRSP and $280/mo Canada Life insurance show organized financial planning. At 39, significant accumulation ahead.",
    recommendedActions: [
      { priority: 1, action: "Present TD Waterhouse fee comparison", rationale: "TD Waterhouse charges trading commissions + fund MERs. Consolidation pitch.", estimatedImpact: "$14.4K/year AUM", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Verify whether TD Waterhouse relationship is linked to Saskatchewan Health Authority group benefits.",
  },
  c037: {
    score: 80,
    confidence: "high",
    signals: [
      { type: "competitor_investment", description: "$2,500/mo flowing to Scotia iTRADE (RRSP)", severity: "high", estimatedValue: 30000, relatedTransactionIds: [] },
      { type: "competitor_investment", description: "$1,000/mo flowing to Scotia iTRADE (TFSA)", severity: "high", estimatedValue: 12000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $320/mo to Manulife", severity: "medium", estimatedValue: 3840, relatedTransactionIds: [] },
    ],
    summary: "Martin is a patent attorney with $3,500/mo flowing to Scotia iTRADE. High income ($175K) at 45 means significant accumulated wealth. Strong referral lead.",
    detailedReasoning: "Martin Nguyen's $3,500/mo combined Scotia iTRADE investments plus Manulife insurance represent a comprehensive financial relationship. At 45 with $175K income, accumulated balance is likely $400K+. Referred by existing client.",
    recommendedActions: [
      { priority: 1, action: "Schedule investment consolidation review", rationale: "Scotia iTRADE charges $9.99/trade. Combined with fund fees, savings are compelling.", estimatedImpact: "$42K/year AUM + $400K+ accumulated", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Assess whether Martin's Scotia relationship includes preferential rates or corporate law firm banking ties.",
  },
  c038: {
    score: 57,
    confidence: "medium",
    signals: [
      { type: "competitor_investment", description: "$800/mo flowing to BMO InvestorLine (RRSP)", severity: "medium", estimatedValue: 9600, relatedTransactionIds: [] },
      { type: "competitor_tfsa", description: "$500/mo flowing to BMO InvestorLine (TFSA)", severity: "medium", estimatedValue: 6000, relatedTransactionIds: [] },
    ],
    summary: "Samira is a financial analyst with $1,300/mo BMO investments. Her finance background means she'll evaluate any switch analytically.",
    detailedReasoning: "At 34 with $98K income, Samira's $1,300/mo BMO investments are solid. As a financial analyst, she understands fee structures and will need a data-driven pitch. Referral lead.",
    recommendedActions: [
      { priority: 1, action: "Prepare detailed fee analysis", rationale: "Financial analysts respond to numbers. Show exact fee savings comparison.", estimatedImpact: "$15.6K/year AUM", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Financial professionals may have strong opinions on investment strategy. Respect her expertise and focus on platform features.",
  },
  c039: {
    score: 75,
    confidence: "high",
    signals: [
      { type: "competitor_investment", description: "$3,500/mo flowing to Edward Jones (RRIF)", severity: "high", estimatedValue: 42000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $400/mo to Sun Life Financial", severity: "medium", estimatedValue: 4800, relatedTransactionIds: [] },
      { type: "large_balance_idle", description: "High chequing balance of $215,000 for a retired individual", severity: "high", estimatedValue: 215000, relatedTransactionIds: [] },
    ],
    summary: "Tyler is a retired executive with $3,500/mo Edward Jones RRIF withdrawals, $215K idle chequing balance, and Sun Life insurance. Very high-value retiree lead.",
    detailedReasoning: "Tyler Brooks is a 60-year-old retired executive with $215K in chequing — significantly high idle cash. His Edward Jones RRIF of $3,500/mo suggests a large portfolio ($500K+). At $65K pension income, the RRIF and idle cash represent the core opportunity. Referred by existing client.",
    recommendedActions: [
      { priority: 1, action: "Schedule retirement income optimization review", rationale: "$215K idle cash is losing to inflation. High-interest savings or GIC ladder needed.", estimatedImpact: "$215K cash optimization", requiresHumanApproval: true },
      { priority: 2, action: "Present Edward Jones fee comparison", rationale: "Edward Jones charges 1.5%+ advisory fees. On a $500K+ RRIF, fee savings are substantial.", estimatedImpact: "$42K/year AUM + $500K+ accumulated", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "Retirees need careful handling. Verify Tyler's income needs, health status, and whether Edward Jones provides valued personal advice.",
  },
  c040: {
    score: 88,
    confidence: "high",
    signals: [
      { type: "competitor_investment", description: "$3,500/mo flowing to RBC Dominion Securities (RRSP)", severity: "high", estimatedValue: 42000, relatedTransactionIds: [] },
      { type: "competitor_tfsa", description: "$1,500/mo flowing to RBC Direct Investing (TFSA)", severity: "high", estimatedValue: 18000, relatedTransactionIds: [] },
      { type: "competitor_insurance", description: "Insurance premiums of $500/mo to Great-West Life", severity: "medium", estimatedValue: 6000, relatedTransactionIds: [] },
      { type: "large_balance_idle", description: "Recent $45K consulting fee deposit adds to investable capital", severity: "high", estimatedValue: 45000, relatedTransactionIds: [] },
    ],
    summary: "Preethi is a dermatologist with $5,000/mo flowing to RBC investments, Great-West Life insurance, and a recent $45K consulting deposit. Highest-scoring external lead with $600K+ estimated portfolio.",
    detailedReasoning: "Preethi Ranganathan has the strongest external lead profile. At 42 with $230K income, her $5,000/mo combined RBC investments suggest $600K+ accumulated. A recent $45K consulting fee adds immediate investable capital. Great-West Life insurance at $500/mo indicates comprehensive coverage. Referred by existing client with strong engagement signals.",
    recommendedActions: [
      { priority: 1, action: "Priority wealth management consultation", rationale: "Highest-value external lead. RBC management fees on $600K+ portfolio means thousands in potential savings.", estimatedImpact: "$60K/year AUM + $600K+ accumulated + $45K new capital", requiresHumanApproval: true },
      { priority: 2, action: "Explore corporate investment structure", rationale: "As a specialist physician, corporate investment account offers tax-efficient retained earnings.", estimatedImpact: "New corporate account", requiresHumanApproval: true },
      { priority: 3, action: "Review insurance optimization", rationale: "$500/mo insurance may be over-covered or could be optimized.", estimatedImpact: "Cross-sell opportunity", requiresHumanApproval: true },
    ],
    humanDecisionRequired: "RBC Dominion Securities provides full-service wealth management. Verify that Preethi would receive equivalent advice quality. Also assess whether her medical corporation structure requires specialized investment advice.",
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
