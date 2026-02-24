# AI-Native Lead Generation for Wealthsimple Advisors

## What can a human now do that they couldn't do before?

Today, advisors have no systematic way to find cross-sell opportunities in clients' transaction data. An advisor managing 200+ accounts would need to manually review statements to spot a $2,000/month PAD flowing to TD Direct Investing or a mortgage renewal at Scotiabank. In practice, these signals go unnoticed.

With this system, advisors see their highest-priority opportunities ranked by AI score. They drill into any lead for a plain-English explanation of *why* the AI flagged this client — dollar amounts, competitor relationships, life event triggers — then decide whether to reach out. Hours of manual forensic work become seconds of informed review.

## What is the AI responsible for?

The AI operates in two layers. First, a deterministic rule engine scans transactions for known patterns: PADs to competitor platforms (TD, RBC, BMO, Sun Life, Manulife), mortgage payments to other banks, income changes via direct deposit fluctuations, idle cash, and competitor insurance premiums. These rules are auditable and predictable.

Second, the Claude API synthesizes signals into a lead profile — scoring 0-100, explaining reasoning in natural language, and suggesting advisor actions. Structured output via Claude's tool-use feature guarantees consistent JSON schemas, making analysis reliable for display and filtering.

## Where does the AI stop? What is the one critical decision that must remain human?

**Whether to contact a client and what product to recommend must remain a human decision.**

Under Canadian securities regulation (CIRO KYC and suitability), recommending products requires understanding the complete picture — risk tolerance, timeline, tax situation, and goals. Transaction data cannot capture these. A $3,000/month PAD to Sun Life might be an employer-matched group RRSP the client would lose by switching. A large idle balance might be earmarked for business expansion.

The AI surfaces these unknowns through a "Human Decision Required" statement identifying what the advisor must verify. The advisor decision panel requires acknowledgment before any status change — no lead progresses without human judgment.

## What breaks first when you scale this to 2 million clients?

Latency and signal noise break simultaneously.

The rule engine stays fast at 2M clients — pattern matching is O(n) and parallelizable. But the LLM layer cannot process millions in real-time. The solution: run rules as a nightly batch, then invoke the LLM only for the top 5-10% exceeding a signal threshold. This cuts LLM calls from 2M to ~150K while ensuring no high-value lead is missed.

Signal noise is harder. At 2M clients, a 1% false-positive rate produces 20,000 bad leads that erode advisor trust. The fix is a feedback loop: track which leads advisors convert versus dismiss, then retrain signal weights on real outcomes. The architecture already stores advisor decisions alongside AI analyses, providing the training data this loop requires.
