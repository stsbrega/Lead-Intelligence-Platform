# Lead Intelligence for Wealthsimple Advisors

An AI-powered lead qualification and scoring system that transforms client transaction data into prioritized advisor opportunities. Built for Wealthsimple's financial advisory team.

**Live app:** [wealthsimple-lead-gen.onrender.com](https://wealthsimple-lead-gen.onrender.com)

> **The advisor's time goes to what matters -- the conversation.**

## The Problem

Wealthsimple now holds clients' bank accounts. Transaction data is a goldmine of cross-sell signals -- $2,000/month PADs flowing to TD Direct Investing, mortgage renewals at Scotiabank, idle cash sitting uninvested -- but advisors managing 200+ accounts have no systematic way to find them. In practice, these signals go unnoticed.

## The Solution

This system scans client banking activity, identifies high-value opportunities using a hybrid AI approach (deterministic rules + LLM synthesis), scores leads on a 5-dimension qualification framework, and surfaces them as ranked, actionable recommendations -- each with a plain-English explanation of *why* this client was flagged.

Hours of manual forensic work become seconds of informed review.

---

## Key Features

### Dashboard
Total leads, high-priority count, average composite score, opportunity breakdown (investing vs lending), tier distribution, and top signal types -- all at a glance.

### Lead Qualification Scoring (5-Dimension System)
Every lead is scored 0-100 across five dimensions with vertical-specific weights:

| Dimension | What It Measures |
|-----------|-----------------|
| **Demographic Fit** | Age, income, employment stability, location, credit score |
| **Financial Qualification** | DTI ratio, savings patterns, defaults, collateral potential |
| **Behavioral Engagement** | Web/app activity, email engagement, form submissions, branch visits |
| **Intent Signals** | Applications started, rate comparisons, life events, competitor mentions |
| **Compliance Readiness** | Identity verified, sanctions/PEP screening, KYC/AML status |

**Tier Thresholds:**
- **Tier A (80-100):** Sales-Ready -- route to senior advisor within 4 hours
- **Tier B (60-79):** Sales-Qualified -- 24-48 hour follow-up
- **Tier C (40-59):** Marketing-Qualified -- automated nurture
- **Tier D (0-39):** Unqualified -- archive

### AI Analysis Layer
- **Deterministic Rules:** Transaction pattern matching for competitor flows, mortgage payments, insurance premiums, income changes, idle cash, and life events
- **LLM Synthesis:** Claude's tool-use feature produces structured analysis -- score, signals, summary, reasoning, and recommended actions
- **Human-in-the-Loop:** AI surfaces recommendations; advisors make final contact and product decisions. No lead progresses without human judgment

### Meeting Notes Analysis
Advisors upload notes from client meetings (drag-drop .txt, .docx, .xlsx, .pdf). The AI extracts new signals, generates insights that supplement transaction-based analysis, and adjusts lead scores accordingly.

### Competitor Intelligence
One-click competitive analysis comparing Wealthsimple vs. detected competitor institutions, with talking points tailored to the specific client's products and dollar amounts.

### AI Resilience Architecture
The system never fails due to LLM availability. A multi-provider fallback chain ensures uptime:

```
Claude Sonnet 4 (primary, best quality)
  --> retry once on transient errors (429/500/529)
Claude Haiku 4.5 (fallback, fast)
  --> retry once on transient errors
Groq Llama 3.3 70B (last resort, open-source)
  --> Zod schema validation
  --> if invalid: Claude auto-repairs the response
```

All responses are validated against Zod schemas before reaching the database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.1.6 (App Router) |
| **Frontend** | React 19, Tailwind CSS 4, TypeScript 5 |
| **Database** | SQLite via better-sqlite3 |
| **Primary AI** | Anthropic Claude (Sonnet 4 + Haiku 4.5) |
| **Fallback AI** | Groq (Llama 3.3 70B via OpenAI SDK) |
| **Validation** | Zod 4.3.6 (runtime schema validation) |
| **File Parsing** | pdf-parse, SheetJS (xlsx), UTF-8 passthrough |

---

## Getting Started

### Prerequisites
- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/) (required)
- A [Groq API key](https://console.groq.com/) (optional -- fallback only)

### Installation

```bash
git clone https://github.com/stsbrega/Lead-Intelligence-Platform.git
cd wealthsimple-lead-gen
npm install
```

### Environment Setup

Copy the example environment file and add your API keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
GROQ_API_KEY=gsk_your-key-here        # optional
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for local development, or visit the [live deployment](https://wealthsimple-lead-gen.onrender.com).

### Build for Production

```bash
npm run build
npm run start
```

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/                    # REST API routes
│   │   ├── analyze/            # Trigger AI analysis for a client
│   │   ├── analyze-notes/      # Analyze advisor meeting notes
│   │   ├── create-lead-from-notes/  # New lead from unstructured text
│   │   ├── competitor-compare/ # Competitive intelligence
│   │   ├── dashboard/          # Dashboard metrics
│   │   ├── lead-counts/        # Counts by status/tier
│   │   └── leads/              # List + detail + status updates
│   ├── leads/
│   │   ├── page.tsx            # Lead list with filtering
│   │   ├── new/page.tsx        # "Add from Notes" upload page
│   │   └── [id]/page.tsx       # Lead detail (scoring, analysis, decisions)
│   └── methodology/            # Scoring methodology documentation
├── components/
│   ├── layout/                 # Sidebar, Providers
│   ├── leads/                  # AdvisorDecisionPanel, DropZones, Signals
│   └── ui/                     # Card, Badge, ScoreBar, MetricCard
├── lib/
│   ├── ai/                     # AI layer
│   │   ├── client.ts           # Resilience chain (Sonnet -> Haiku -> Groq -> self-heal)
│   │   ├── schemas.ts          # Zod validation schemas
│   │   ├── engine.ts           # Transaction analysis orchestration
│   │   ├── lead-from-notes.ts  # Notes -> structured lead
│   │   ├── notes-analyzer.ts   # Notes -> supplemental insights
│   │   ├── groq-client.ts      # Groq/OpenAI-compatible wrapper
│   │   ├── self-heal.ts        # Auto-repair malformed responses
│   │   ├── signals.ts          # Deterministic signal detection
│   │   └── prompts.ts          # System & user prompt templates
│   ├── data/
│   │   ├── db.ts               # SQLite connection
│   │   └── schema.sql          # Database schema
│   ├── scoring/                # 5-dimension qualification scoring
│   │   ├── config.ts           # Weights, thresholds, criteria
│   │   ├── scorer.ts           # Core dimension scoring logic
│   │   └── compute.ts          # Server-side score computation
│   └── file-parser.ts          # DOCX/XLSX/PDF/TXT extraction
└── types/
    └── index.ts                # Central TypeScript interfaces
```

---

## API Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/analyze` | Trigger AI analysis for a client |
| `POST` | `/api/analyze-notes` | Analyze advisor meeting notes |
| `POST` | `/api/create-lead-from-notes` | Generate new lead from unstructured text |
| `POST` | `/api/competitor-compare` | Competitive intelligence comparison |
| `GET` | `/api/dashboard` | Dashboard metrics |
| `GET` | `/api/lead-counts` | Lead counts by status and tier |
| `GET` | `/api/leads` | List all leads |
| `GET` | `/api/leads/[id]` | Single lead detail + transactions + analysis |
| `PATCH` | `/api/leads/[id]` | Update lead status and advisor notes |

---

## Signal Detection

The system detects these signal types from transaction data:

| Signal | Description | Example |
|--------|-------------|---------|
| `competitor_rrsp` | Monthly contributions to competitor RRSP | $500/mo PAD to TD Direct Investing |
| `competitor_tfsa` | TFSA flows to competitor platforms | $300/mo to RBC Direct Investing |
| `competitor_insurance` | Insurance premiums at competitors | $200/mo to Sun Life |
| `mortgage_refinance` | Mortgage payments to another lender | $2,100/mo to Scotiabank Mortgage |
| `income_change` | Salary increase detected (>10%) | Direct deposit jumped from $4k to $5.2k |
| `large_balance_idle` | >$25K sitting uninvested | $42,000 in chequing, no investment activity |
| `life_event` | Large one-time deposit (>$10K) | $85,000 inheritance deposit |

---

## Design Decisions

1. **Human-in-the-Loop**: AI surfaces opportunities; advisors own all contact and product decisions (CIRO KYC/suitability compliance)
2. **Deterministic + LLM Hybrid**: Rules identify patterns predictably; Claude synthesizes context and nuance
3. **Compliance Gate**: Separate compliance sub-score auto-disqualifies sanctioned entities
4. **Signal Decay**: Behavioral signals lose weight over time (configurable half-life)
5. **Vertical-Specific Weights**: Scoring adapts to product category (retail banking, wealth management, mortgage, commercial)
6. **Multi-Provider Resilience**: Three LLM providers with automatic fallback and self-healing validation
7. **Immutable Audit Trail**: All advisor decisions logged with timestamps

---

## Deployment

The app is deployed on [Render](https://render.com). Required environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for primary AI analysis |
| `GROQ_API_KEY` | No | Groq API key for last-resort fallback |

---

## Demo Materials

- `demo/` -- Sample data files (CSV bank statements, meeting notes)
- `docs/demo-script.md` -- Silent video demo recording guide
- `docs/written-explanation.md` -- Executive summary of AI responsibility boundaries
