import db from "./db";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DuplicateCandidate {
  clientId: string;
  firstName: string;
  lastName: string;
  city: string;
  province: string;
  occupation: string;
  age: number;
  score: number | null;
  matchConfidence: "exact" | "high" | "medium";
  matchReasons: string[];
}

interface AdditionalFields {
  city?: string;
  province?: string;
  occupation?: string;
  age?: number;
}

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  province: string;
  occupation: string;
  age: number;
  score: number | null;
}

// ── Nickname Map ─────────────────────────────────────────────────────────────

const NICKNAME_MAP: Record<string, string[]> = {
  michael: ["mike", "mick", "mikey"],
  robert: ["rob", "bob", "bobby", "robbie"],
  william: ["will", "bill", "billy", "willy", "liam"],
  elizabeth: ["liz", "beth", "betty", "eliza", "lizzy"],
  james: ["jim", "jimmy", "jamie"],
  margaret: ["maggie", "meg", "peggy", "marg"],
  katherine: ["kate", "kathy", "katie", "cathy", "kat"],
  catherine: ["cathy", "cat", "kate", "katie"],
  richard: ["rick", "dick", "rich", "ricky"],
  jennifer: ["jen", "jenny", "jenn"],
  christopher: ["chris", "kit"],
  patricia: ["pat", "trish", "patty"],
  daniel: ["dan", "danny"],
  matthew: ["matt", "matty"],
  nicholas: ["nick", "nicky"],
  benjamin: ["ben", "benny"],
  jonathan: ["jon", "john", "jonny"],
  john: ["jon", "johnny", "jack"],
  stephanie: ["steph"],
  thomas: ["tom", "tommy"],
  alexander: ["alex", "xander"],
  timothy: ["tim", "timmy"],
  anthony: ["tony"],
  joseph: ["joe", "joey"],
  andrew: ["andy", "drew"],
  joshua: ["josh"],
  david: ["dave", "davey"],
  steven: ["steve", "stephen"],
  stephen: ["steve", "steven"],
  samuel: ["sam", "sammy"],
  edward: ["ed", "eddie", "ted", "teddy"],
  charles: ["charlie", "chuck"],
  jessica: ["jess", "jessie"],
  victoria: ["vicky", "tori"],
  rebecca: ["becca", "becky"],
  alexandra: ["alex", "lexi"],
  deborah: ["deb", "debbie"],
  susan: ["sue", "suzy"],
  barbara: ["barb", "barbie"],
  theresa: ["terry", "tess"],
  mohammad: ["mohammed", "muhammad", "mo"],
  mohammed: ["mohammad", "muhammad", "mo"],
};

/** Build reverse lookup: "mike" → "michael", "bob" → "robert", etc. */
const REVERSE_NICKNAME: Record<string, string[]> = {};
for (const [formal, nicks] of Object.entries(NICKNAME_MAP)) {
  for (const nick of nicks) {
    if (!REVERSE_NICKNAME[nick]) REVERSE_NICKNAME[nick] = [];
    if (!REVERSE_NICKNAME[nick].includes(formal)) {
      REVERSE_NICKNAME[nick].push(formal);
    }
  }
}

/** Get all name variants (including the name itself) */
function getNameVariants(name: string): string[] {
  const lower = name.toLowerCase();
  const variants = new Set<string>([lower]);

  // formal → nicknames
  if (NICKNAME_MAP[lower]) {
    for (const nick of NICKNAME_MAP[lower]) variants.add(nick);
  }
  // nickname → formal names
  if (REVERSE_NICKNAME[lower]) {
    for (const formal of REVERSE_NICKNAME[lower]) variants.add(formal);
  }

  return Array.from(variants);
}

// ── Levenshtein Distance ─────────────────────────────────────────────────────

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ── Name Normalization ───────────────────────────────────────────────────────

/** Title-case a name: "MICHAEL THORNTON" → "Michael Thornton" */
export function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ── Corroborating Field Checks ───────────────────────────────────────────────

function addCorroboratingReasons(
  candidate: ClientRow,
  fields: AdditionalFields | undefined,
  reasons: string[]
): "exact" | "high" | "medium" {
  let boosts = 0;

  if (fields?.city && candidate.city) {
    if (candidate.city.toLowerCase() === fields.city.toLowerCase() && fields.city.toLowerCase() !== "unknown") {
      reasons.push(`Same city (${candidate.city})`);
      boosts++;
    }
  }

  if (fields?.occupation && candidate.occupation) {
    if (candidate.occupation.toLowerCase() === fields.occupation.toLowerCase()) {
      reasons.push(`Same occupation (${candidate.occupation})`);
      boosts++;
    }
  }

  if (fields?.province && candidate.province) {
    if (candidate.province.toLowerCase() === fields.province.toLowerCase()) {
      reasons.push(`Same province (${candidate.province})`);
    }
  }

  if (fields?.age && candidate.age && fields.age > 0 && candidate.age > 0) {
    if (Math.abs(candidate.age - fields.age) <= 5) {
      reasons.push(`Similar age (${candidate.age})`);
      boosts++;
    }
  }

  // Return upgraded confidence if corroborating fields match
  if (boosts >= 2) return "exact";
  if (boosts >= 1) return "high";
  return "medium";
}

// ── Main Function ────────────────────────────────────────────────────────────

/**
 * Find potential duplicate clients by fuzzy name matching.
 *
 * Uses a multi-tier approach:
 *  1. Exact match (case-insensitive)
 *  2. Nickname matching (Michael↔Mike) + first/last name swap
 *  3. Prefix/partial match (Jonathan↔Jon)
 *  4. Levenshtein distance ≤ 2 on last name
 *
 * Corroborating fields (city, occupation, age) boost confidence.
 */
export function findPotentialDuplicates(
  firstName: string,
  lastName: string,
  additionalFields?: AdditionalFields,
  excludeClientId?: string
): DuplicateCandidate[] {
  const results = new Map<string, DuplicateCandidate>();
  const fn = firstName.trim().toLowerCase();
  const ln = lastName.trim().toLowerCase();

  if (!fn || !ln) return [];

  // ── Tier 1: Exact match (case-insensitive) ──────────────────────────────

  const exactMatches = db
    .prepare(
      `SELECT c.id, c.first_name, c.last_name, c.city, c.province, c.occupation, c.age,
              a.score
       FROM clients c
       LEFT JOIN analyses a ON c.id = a.client_id
       WHERE LOWER(c.first_name) = ? AND LOWER(c.last_name) = ?`
    )
    .all(fn, ln) as ClientRow[];

  for (const row of exactMatches) {
    if (excludeClientId && row.id === excludeClientId) continue;
    const reasons = ["Exact name match"];
    addCorroboratingReasons(row, additionalFields, reasons);
    results.set(row.id, {
      clientId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      city: row.city || "",
      province: row.province || "",
      occupation: row.occupation || "",
      age: row.age || 0,
      score: row.score,
      matchConfidence: "exact",
      matchReasons: reasons,
    });
  }

  // ── Tier 2: Nickname match + first/last swap ─────────────────────────────

  const firstNameVariants = getNameVariants(fn);

  // Nickname matching: check all variants of the first name
  for (const variant of firstNameVariants) {
    if (variant === fn) continue; // skip exact (already checked)
    const nicknameMatches = db
      .prepare(
        `SELECT c.id, c.first_name, c.last_name, c.city, c.province, c.occupation, c.age,
                a.score
         FROM clients c
         LEFT JOIN analyses a ON c.id = a.client_id
         WHERE LOWER(c.first_name) = ? AND LOWER(c.last_name) = ?`
      )
      .all(variant, ln) as ClientRow[];

    for (const row of nicknameMatches) {
      if (excludeClientId && row.id === excludeClientId) continue;
      if (results.has(row.id)) continue;
      const reasons = [`Nickname match (${firstName} ↔ ${row.first_name})`];
      const boosted = addCorroboratingReasons(row, additionalFields, reasons);
      results.set(row.id, {
        clientId: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        city: row.city || "",
        province: row.province || "",
        occupation: row.occupation || "",
        age: row.age || 0,
        score: row.score,
        matchConfidence: boosted === "exact" ? "exact" : "high",
        matchReasons: reasons,
      });
    }
  }

  // First/last name swap
  const swapMatches = db
    .prepare(
      `SELECT c.id, c.first_name, c.last_name, c.city, c.province, c.occupation, c.age,
              a.score
       FROM clients c
       LEFT JOIN analyses a ON c.id = a.client_id
       WHERE LOWER(c.first_name) = ? AND LOWER(c.last_name) = ?`
    )
    .all(ln, fn) as ClientRow[];

  for (const row of swapMatches) {
    if (excludeClientId && row.id === excludeClientId) continue;
    if (results.has(row.id)) continue;
    const reasons = ["Possible first/last name swap"];
    const boosted = addCorroboratingReasons(row, additionalFields, reasons);
    results.set(row.id, {
      clientId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      city: row.city || "",
      province: row.province || "",
      occupation: row.occupation || "",
      age: row.age || 0,
      score: row.score,
      matchConfidence: boosted === "exact" ? "exact" : "high",
      matchReasons: reasons,
    });
  }

  // ── Tier 3: Prefix/partial match ─────────────────────────────────────────

  // Short first name is prefix of longer (Jon → Jonathan, or Jonathan → Jon)
  const prefixMatches = db
    .prepare(
      `SELECT c.id, c.first_name, c.last_name, c.city, c.province, c.occupation, c.age,
              a.score
       FROM clients c
       LEFT JOIN analyses a ON c.id = a.client_id
       WHERE LOWER(c.last_name) = ?
         AND (LOWER(c.first_name) LIKE ? || '%' OR ? LIKE LOWER(c.first_name) || '%')
         AND LOWER(c.first_name) != ?`
    )
    .all(ln, fn, fn, fn) as ClientRow[];

  for (const row of prefixMatches) {
    if (excludeClientId && row.id === excludeClientId) continue;
    if (results.has(row.id)) continue;
    const reasons = [`Similar first name (${firstName} ↔ ${row.first_name})`];
    const boosted = addCorroboratingReasons(row, additionalFields, reasons);
    results.set(row.id, {
      clientId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      city: row.city || "",
      province: row.province || "",
      occupation: row.occupation || "",
      age: row.age || 0,
      score: row.score,
      matchConfidence: boosted === "exact" ? "exact" : "high",
      matchReasons: reasons,
    });
  }

  // ── Tier 4: Levenshtein distance on last name ────────────────────────────

  // Narrow candidates by first 2 chars of last name to avoid full table scan
  if (ln.length >= 2) {
    const prefix = ln.slice(0, 2);
    const levenCandidates = db
      .prepare(
        `SELECT c.id, c.first_name, c.last_name, c.city, c.province, c.occupation, c.age,
                a.score
         FROM clients c
         LEFT JOIN analyses a ON c.id = a.client_id
         WHERE LOWER(SUBSTR(c.last_name, 1, 2)) = ?`
      )
      .all(prefix) as ClientRow[];

    for (const row of levenCandidates) {
      if (excludeClientId && row.id === excludeClientId) continue;
      if (results.has(row.id)) continue;

      const lastDist = levenshteinDistance(ln, row.last_name.toLowerCase());
      if (lastDist > 0 && lastDist <= 2) {
        // Also check first name is somewhat close
        const firstDist = levenshteinDistance(fn, row.first_name.toLowerCase());
        if (firstDist <= 3) {
          const reasons = [`Similar spelling (${row.first_name} ${row.last_name})`];
          const boosted = addCorroboratingReasons(row, additionalFields, reasons);
          results.set(row.id, {
            clientId: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            city: row.city || "",
            province: row.province || "",
            occupation: row.occupation || "",
            age: row.age || 0,
            score: row.score,
            matchConfidence: boosted === "exact" || boosted === "high" ? "high" : "medium",
            matchReasons: reasons,
          });
        }
      }
    }
  }

  // ── Sort: exact first, then high, then medium ────────────────────────────

  const order: Record<string, number> = { exact: 0, high: 1, medium: 2 };
  return Array.from(results.values()).sort(
    (a, b) => (order[a.matchConfidence] ?? 3) - (order[b.matchConfidence] ?? 3)
  );
}
