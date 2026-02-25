# Architecture & Development Plan

This document covers the architectural decisions, system design, and future roadmap for the Lead Intelligence platform.

---

## System Architecture

### Data Flow

```
Client Bank Transactions
        |
        v
  +-----------------+
  | Deterministic    |  Pattern matching: competitor PADs, mortgages,
  | Rule Engine      |  insurance, income changes, idle cash, life events
  +-----------------+
        |
        v  (pre-detected signals)
  +-----------------+
  | LLM Synthesis   |  Claude scores, summarizes, explains, recommends
  | (Tool Use)      |  Structured output via function calling
  +-----------------+
        |
        v  (validated JSON)
  +-----------------+
  | 5-Dimension     |  Demographic, Financial, Behavioral,
  | Scoring Engine  |  Intent, Compliance -- weighted by vertical
  +-----------------+
        |
        v
  +-----------------+
  | Advisor Review  |  Human-in-the-loop: approve, reject, or defer
  | & Decision      |  Every action logged with timestamps
  +-----------------+
```

### Why Two AI Layers?

The deterministic rule engine and the LLM serve different purposes:

- **Rules** are auditable, predictable, and fast. When a $2,000/month PAD to TD Direct Investing appears in transactions, the rule engine flags it immediately. There is no ambiguity, no prompt variation, and no latency cost. Regulators can inspect the logic.

- **Claude** synthesizes context that rules cannot. It reads the full picture -- multiple signals across time, income trajectory, life stage markers -- and produces a natural-language explanation that an advisor can act on in seconds. It also suggests actions, sizes the opportunity, and states what the advisor must verify.

Neither layer replaces the other. Rules catch what is known; the LLM reasons about what is implied.

---

## AI Resilience Architecture

### The Problem

LLM APIs have variable availability. Claude Sonnet returns 529 (overloaded) during peak hours. A single-provider architecture means the advisor sees an error spinner where they expected a lead analysis.

### The Solution: Multi-Provider Fallback with Self-Healing

```
Request
  |
  v
Claude Sonnet 4 (primary -- best quality)
  |-- success --> Zod validate --> return
  |-- transient error (429/500/529) --> retry once --> retry failed?
  v
Claude Haiku 4.5 (fallback -- fast, lighter model)
  |-- success --> Zod validate --> return
  |-- transient error --> retry once --> retry failed?
  v
Groq Llama 3.3 70B (last resort -- open-source, high availability)
  |-- success --> Zod validate --> valid? return
  |                                  |
  |                                  invalid?
  |                                  v
  |                            Claude Sonnet repairs the JSON
  |                            Re-validate with Zod --> return
  |
  |-- all providers failed --> surface error (genuine infrastructure outage)
```

**Key design decisions:**

1. **Claude responses bypass strict validation on failure.** If Claude's output doesn't perfectly match the Zod schema, the system logs a warning but still uses the data. Claude is the trusted provider -- its output is structurally sound 99%+ of the time, and minor schema deviations (e.g., an extra field) shouldn't block the advisor.

2. **Groq responses must pass validation.** Open-source models produce structurally invalid JSON more frequently, especially for complex nested schemas with enums. Every Groq response is validated before reaching the database.

3. **Self-healing over error messages.** When Groq returns invalid data, the system sends the malformed JSON, the Zod validation errors, and the schema description to Claude Sonnet. Claude repairs the structure while preserving the data. The advisor never sees a "bad data" error.

4. **Tool use format conversion.** Anthropic's tool schema (`input_schema`) and OpenAI's function calling format (`parameters`) use identical inner JSON Schema -- only the wrapper differs. The Groq client handles this conversion transparently.

### Error Behavior Matrix

| Scenario | User Experience | Latency |
|----------|----------------|---------|
| Sonnet succeeds | Normal result | ~2-3s |
| Sonnet down, Haiku succeeds | Normal result | ~3-5s |
| Both Claude models down, Groq succeeds + valid | Normal result | ~4-6s |
| Both Claude down, Groq succeeds + invalid data | Normal result (auto-repaired) | ~6-10s |
| All providers fail | Error message | N/A |

---

## Scoring System Design

### 5-Dimension Qualification Framework

Every lead is scored 0-100 across five independent dimensions:

| Dimension | What It Captures |
|-----------|-----------------|
| Demographic Fit | Age, income, occupation, location, credit profile |
| Financial Qualification | DTI ratio, savings patterns, defaults, collateral |
| Behavioral Engagement | Web visits, email engagement, branch visits, referrals |
| Intent Signals | Applications started, rate comparisons, life events |
| Compliance Readiness | Identity verification, sanctions screening, KYC/AML |

### Vertical-Specific Weights

Dimension weights adapt to the product category because conversion drivers differ:

| Dimension | Retail | Commercial | Mortgage | Wealth Mgmt |
|-----------|--------|------------|----------|-------------|
| Demographic | 0.20 | 0.15 | 0.15 | 0.20 |
| Financial | 0.15 | 0.25 | 0.30 | 0.25 |
| Behavioral | 0.30 | 0.20 | 0.20 | 0.15 |
| Intent | 0.25 | 0.25 | 0.25 | 0.20 |
| Compliance | 0.10 | 0.15 | 0.10 | 0.20 |

Wealth management weighs compliance most heavily (KYC/source-of-wealth requirements are stricter). Retail banking weighs behavioral engagement most (frequent app usage predicts cross-sell). Mortgage weighs financial qualification most (DTI and creditworthiness gate approval).

### Tier Routing

| Tier | Score | Label | SLA |
|------|-------|-------|-----|
| A | 80-100 | Sales-Ready | Senior advisor within 4 hours |
| B | 60-79 | Sales-Qualified | Follow-up within 24-48 hours |
| C | 40-59 | Marketing-Qualified | Automated nurture campaign |
| D | 0-39 | Unqualified | Archive |

### Signal Decay

Behavioral and intent signals lose weight over time via configurable half-lives:

- `branch_visit`: 30 points, 45-day half-life
- `email_open`: 3 points, 14-day half-life
- `customer_referral`: 35 points, no decay

A branch visit from 90 days ago contributes ~7.5 points (two half-lives). This prevents stale signals from inflating scores.

### Compliance Gate

A hard compliance gate auto-holds leads with sub-40 compliance scores regardless of composite score. A sanctions flag (-100 points) auto-disqualifies. This is non-negotiable and cannot be overridden by high scores in other dimensions.

---

## Database Design

SQLite was chosen for simplicity and deployment portability (single-file database, no external service). The schema prioritizes query patterns used by the dashboard and lead list:

- `clients` -- core client profile
- `transactions` -- bank transaction records with category classification
- `analyses` -- AI analysis results (one per client, UNIQUE constraint)
- `lead_status` -- advisor decisions and notes (audit trail)
- `advisor_note_analyses` -- supplemental AI analysis from meeting notes
- `behavioral_engagement` -- engagement metrics for scoring

Indexes target the most frequent queries: `transactions(client_id)`, `analyses(score DESC)`, `behavioral_engagement(client_id)`.

JSON columns (signals, recommended_actions) store structured arrays as serialized JSON strings. This avoids normalization complexity for data that is always read as a unit.

---

## Compliance Boundaries

### What AI Does

- Scans transactions for known cross-sell patterns
- Scores leads on a multi-dimensional framework
- Explains findings in plain English
- Suggests actions with rationale

### What AI Does Not Do

- **Recommend specific financial products** -- suitability requires KYC assessment under CIRO rules
- **Decide whether to contact a client** -- the advisor makes all contact decisions
- **Assess risk tolerance or investment goals** -- transaction data cannot capture these
- **Progress leads without human judgment** -- every status change requires advisor acknowledgment

The `humanDecisionRequired` field in every analysis explicitly states what the advisor must verify before proceeding.

---

## Scaling Considerations

### What works at 2M clients

- **Rule engine**: O(n) pattern matching, parallelizable. Run as nightly batch.
- **Database queries**: SQLite handles read-heavy workloads well. Dashboard aggregations are simple.
- **Signal detection**: Stateless per-client, can be distributed across workers.

### What breaks at 2M clients

1. **LLM latency**: Cannot run 2M Claude calls in real-time. Solution: batch the rule engine nightly, then invoke the LLM only for the top 5-10% exceeding a signal threshold (~100-200K calls).

2. **Signal noise**: A 1% false-positive rate at 2M clients produces 20,000 bad leads. Solution: implement a feedback loop -- track which leads advisors convert vs. dismiss, then retrain signal weights on real outcomes. The schema already stores decisions alongside analyses.

3. **SQLite single-writer**: SQLite's write-ahead log handles concurrent reads but serializes writes. At scale, migrate to PostgreSQL with connection pooling.

4. **File storage**: Meeting notes uploads are processed in-memory. At scale, store files in S3 and process asynchronously via a job queue.

---

## Future Roadmap

### Near-Term

- [ ] Advisor feedback loop: track conversion rates per signal type, adjust weights
- [ ] Batch analysis mode: analyze all clients on a schedule, not just on-demand
- [ ] Email notifications: alert advisors when new Tier A leads surface
- [ ] Export to CRM: CSV/API export for Salesforce or HubSpot integration

### Medium-Term

- [ ] Real-time transaction webhooks: react to new transactions as they arrive
- [ ] Multi-advisor routing: assign leads by specialization (wealth vs. mortgage)
- [ ] A/B testing framework: test different scoring weights against conversion data
- [ ] Dashboard analytics: advisor performance metrics, lead funnel visualization

### Long-Term

- [ ] PostgreSQL migration for concurrent writes at scale
- [ ] ML-based scoring: replace static weights with models trained on conversion outcomes
- [ ] Natural language search: "show me clients with RRSPs at TD making over $100K"
- [ ] Mobile advisor app: push notifications for Tier A leads

---

## Development Setup

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key (Sonnet + Haiku) |
| `GROQ_API_KEY` | No | Groq API key (last-resort fallback) |

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Claude API (tool use, structured output) |
| `openai` | Groq API (OpenAI-compatible endpoint) |
| `zod` | Runtime schema validation for all AI responses |
| `better-sqlite3` | SQLite database driver |
| `pdf-parse` | PDF file text extraction |
| `xlsx` | Excel file parsing (SheetJS) |

### Commands

```bash
npm run dev     # Start development server (localhost:3000)
npm run build   # Production build
npm run start   # Start production server
npm run lint    # ESLint
```
