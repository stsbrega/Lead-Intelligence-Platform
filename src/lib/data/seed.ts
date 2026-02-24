import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// ── Connect to DB ──────────────────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), "data", "leads.db");
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Read and execute schema ────────────────────────────────────────────
const schemaPath = path.join(process.cwd(), "src", "lib", "data", "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");
db.exec(schema);

// ── Clear all tables before inserting ──────────────────────────────────
db.exec("DELETE FROM lead_status");
db.exec("DELETE FROM analyses");
db.exec("DELETE FROM transactions");
db.exec("DELETE FROM clients");

// ── Helper functions ───────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

/** Returns 6 date strings, the 15th of each month from Sep 2025 to Feb 2026 */
function monthDates(): string[] {
  return [
    "2025-09-15",
    "2025-10-15",
    "2025-11-15",
    "2025-12-15",
    "2026-01-15",
    "2026-02-15",
  ];
}

/** Returns 12 dates: 1st and 15th of each month for 6 months */
function biweeklyDates(): string[] {
  const dates: string[] = [];
  const months = [
    { y: 2025, m: 9 },
    { y: 2025, m: 10 },
    { y: 2025, m: 11 },
    { y: 2025, m: 12 },
    { y: 2026, m: 1 },
    { y: 2026, m: 2 },
  ];
  for (const { y, m } of months) {
    const mm = String(m).padStart(2, "0");
    dates.push(`${y}-${mm}-01`);
    dates.push(`${y}-${mm}-15`);
  }
  return dates;
}

/** Returns ~24 dates: approx 4 per month for 6 months */
function weeklyDates(): string[] {
  const dates: string[] = [];
  const months = [
    { y: 2025, m: 9 },
    { y: 2025, m: 10 },
    { y: 2025, m: 11 },
    { y: 2025, m: 12 },
    { y: 2026, m: 1 },
    { y: 2026, m: 2 },
  ];
  for (const { y, m } of months) {
    const mm = String(m).padStart(2, "0");
    dates.push(`${y}-${mm}-03`);
    dates.push(`${y}-${mm}-10`);
    dates.push(`${y}-${mm}-17`);
    dates.push(`${y}-${mm}-24`);
  }
  return dates;
}

/** Pick N random dates spread across the 6-month window */
function randomDates(count: number): string[] {
  const start = new Date("2025-09-01");
  const end = new Date("2026-02-28");
  const range = end.getTime() - start.getTime();
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + Math.random() * range);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates.sort();
}

// ── Prepared statements ────────────────────────────────────────────────

const insertClient = db.prepare(`
  INSERT INTO clients (id, first_name, last_name, email, age, city, province, occupation, annual_income, account_open_date, total_balance, direct_deposit_active)
  VALUES (@id, @first_name, @last_name, @email, @age, @city, @province, @occupation, @annual_income, @account_open_date, @total_balance, @direct_deposit_active)
`);

const insertTransaction = db.prepare(`
  INSERT INTO transactions (id, client_id, date, amount, description, category, merchant_name, is_recurring, type)
  VALUES (@id, @client_id, @date, @amount, @description, @category, @merchant_name, @is_recurring, @type)
`);

const insertLeadStatus = db.prepare(`
  INSERT INTO lead_status (client_id, status, last_updated)
  VALUES (@client_id, @status, @last_updated)
`);

// ── Client data ────────────────────────────────────────────────────────

const clients = [
  { id: "c001", first_name: "Priya", last_name: "Sharma", email: "priya.sharma@email.com", age: 32, city: "Toronto", province: "ON", occupation: "Senior Software Engineer", annual_income: 155000, account_open_date: "2024-03-15", total_balance: 47200, direct_deposit_active: 1 },
  { id: "c002", first_name: "Jean-Luc", last_name: "Tremblay", email: "jl.tremblay@email.com", age: 45, city: "Montreal", province: "QC", occupation: "High School Teacher", annual_income: 72000, account_open_date: "2024-06-01", total_balance: 18500, direct_deposit_active: 1 },
  { id: "c003", first_name: "Marcus", last_name: "Chen", email: "marcus.chen@email.com", age: 38, city: "Vancouver", province: "BC", occupation: "Restaurant Owner", annual_income: 120000, account_open_date: "2024-01-20", total_balance: 31000, direct_deposit_active: 0 },
  { id: "c004", first_name: "Aisha", last_name: "Okafor", email: "aisha.okafor@email.com", age: 36, city: "Calgary", province: "AB", occupation: "Petroleum Engineer", annual_income: 185000, account_open_date: "2023-11-10", total_balance: 52800, direct_deposit_active: 1 },
  { id: "c005", first_name: "Sarah", last_name: "MacDonald", email: "sarah.macdonald@email.com", age: 67, city: "Halifax", province: "NS", occupation: "Retired Nurse", annual_income: 48000, account_open_date: "2024-02-28", total_balance: 89400, direct_deposit_active: 0 },
  { id: "c006", first_name: "Raj", last_name: "Patel", email: "raj.patel@email.com", age: 52, city: "Winnipeg", province: "MB", occupation: "Dentist (Practice Owner)", annual_income: 210000, account_open_date: "2024-03-01", total_balance: 147300, direct_deposit_active: 0 },
  { id: "c007", first_name: "Emily", last_name: "Larsen", email: "emily.larsen@email.com", age: 29, city: "Ottawa", province: "ON", occupation: "Government Policy Analyst", annual_income: 95000, account_open_date: "2024-08-15", total_balance: 22100, direct_deposit_active: 1 },
  { id: "c008", first_name: "David", last_name: "Kim", email: "david.kim@email.com", age: 24, city: "Toronto", province: "ON", occupation: "Graduate Student", annual_income: 28000, account_open_date: "2025-01-10", total_balance: 4200, direct_deposit_active: 0 },
  { id: "c009", first_name: "Fatima", last_name: "Hassan", email: "fatima.hassan@email.com", age: 41, city: "Edmonton", province: "AB", occupation: "Pharmacist", annual_income: 125000, account_open_date: "2023-09-05", total_balance: 38600, direct_deposit_active: 1 },
  { id: "c010", first_name: "James", last_name: "Whitehorse", email: "james.whitehorse@email.com", age: 34, city: "Yellowknife", province: "NT", occupation: "Mining Technologist", annual_income: 98000, account_open_date: "2024-05-20", total_balance: 67800, direct_deposit_active: 1 },
];

// ── Insert clients ─────────────────────────────────────────────────────

const insertAllClients = db.transaction(() => {
  for (const c of clients) {
    insertClient.run(c);
  }
});
insertAllClients();

// ── Transaction generation per client ──────────────────────────────────

let totalTransactions = 0;

function txId(clientNum: string, txCount: number): string {
  return `t${clientNum}_${String(txCount).padStart(3, "0")}`;
}

interface TxRow {
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

function insertTx(tx: TxRow) {
  insertTransaction.run(tx);
  totalTransactions++;
}

// ── c001 - Priya Sharma ────────────────────────────────────────────────
function seedC001() {
  const cid = "c001";
  const cnum = "001";
  let txCount = 0;

  // Biweekly salary (12 entries)
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 5960, description: "DIRECT DEP - SHOPIFY INC", category: "salary_deposit", merchant_name: "SHOPIFY INC", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: TD RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2000, description: "TD DIRECT INVESTING RRSP", category: "investment_competitor", merchant_name: "TD DIRECT INVESTING", is_recurring: 1, type: "pad" });
  }

  // Monthly: TD TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -500, description: "TD DIRECT INVESTING TFSA", category: "investment_competitor", merchant_name: "TD DIRECT INVESTING", is_recurring: 1, type: "pad" });
  }

  // Monthly: Rogers Wireless
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -85, description: "ROGERS WIRELESS", category: "subscription", merchant_name: "ROGERS WIRELESS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Toronto Hydro
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -120, description: "TORONTO HYDRO", category: "utilities", merchant_name: "TORONTO HYDRO", is_recurring: 1, type: "pad" });
  }

  // Monthly: Equitable Life
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -89, description: "EQUITABLE LIFE INS", category: "insurance_premium", merchant_name: "EQUITABLE LIFE INS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Rent
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2200, description: "INTERAC E-TRF LANDLORD", category: "rent", merchant_name: "LANDLORD", is_recurring: 1, type: "e-transfer" });
  }

  // Weekly: Groceries (~24)
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-150, -90), description: "LOBLAWS #1234", category: "groceries", merchant_name: "LOBLAWS #1234", is_recurring: 0, type: "debit" });
  }

  // ~8 random: Uber Eats
  for (const d of randomDates(8)) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-50, -25), description: "UBER EATS", category: "dining", merchant_name: "UBER EATS", is_recurring: 0, type: "debit" });
  }
}

// ── c002 - Jean-Luc Tremblay ──────────────────────────────────────────
function seedC002() {
  const cid = "c002";
  const cnum = "002";
  let txCount = 0;

  // Biweekly salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 2769, description: "DIRECT DEP - CSDM PAYROLL", category: "salary_deposit", merchant_name: "CSDM PAYROLL", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: Desjardins TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -300, description: "DESJARDINS SECURITIES TFSA", category: "tfsa_contribution", merchant_name: "DESJARDINS SECURITIES", is_recurring: 1, type: "pad" });
  }

  // Monthly (last 3 months only, Dec-Feb): Tutoring income
  const last3 = ["2025-12-15", "2026-01-15", "2026-02-15"];
  for (const d of last3) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(400, 600), description: "INTERAC E-TRF TUTORING", category: "other", merchant_name: "TUTORING", is_recurring: 0, type: "e-transfer" });
  }

  // Monthly: Bell Canada
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -110, description: "BELL CANADA", category: "subscription", merchant_name: "BELL CANADA", is_recurring: 1, type: "pad" });
  }

  // Monthly: Hydro-Quebec
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -95, description: "HYDRO-QUEBEC", category: "utilities", merchant_name: "HYDRO-QUEBEC", is_recurring: 1, type: "pad" });
  }

  // Weekly: Groceries (random merchant)
  const groceryMerchants = ["IGA #567", "METRO PLUS"];
  for (const d of weeklyDates()) {
    txCount++;
    const merchant = groceryMerchants[Math.floor(Math.random() * groceryMerchants.length)];
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-130, -70), description: merchant, category: "groceries", merchant_name: merchant, is_recurring: 0, type: "debit" });
  }

  // ~6 random: SAQ
  for (const d of randomDates(6)) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-30, -15), description: "SAQ", category: "shopping", merchant_name: "SAQ", is_recurring: 0, type: "debit" });
  }
}

// ── c003 - Marcus Chen ────────────────────────────────────────────────
function seedC003() {
  const cid = "c003";
  const cnum = "003";
  let txCount = 0;

  // Monthly irregular business income
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(3000, 8000), description: "INTERAC E-TRF GOLDEN WOK REVENUE", category: "salary_deposit", merchant_name: "GOLDEN WOK", is_recurring: 0, type: "e-transfer" });
  }

  // Monthly: CIBC Mortgage
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2800, description: "CIBC MORTGAGE PYMT", category: "mortgage_payment", merchant_name: "CIBC MORTGAGE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Manulife Business Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -450, description: "MANULIFE BUSINESS INS", category: "insurance_premium", merchant_name: "MANULIFE BUSINESS INS", is_recurring: 1, type: "pad" });
  }

  // Monthly: BC Hydro
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -180, description: "BC HYDRO", category: "utilities", merchant_name: "BC HYDRO", is_recurring: 1, type: "pad" });
  }

  // Monthly: Telus Mobility
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -95, description: "TELUS MOBILITY", category: "subscription", merchant_name: "TELUS MOBILITY", is_recurring: 1, type: "pad" });
  }

  // Biweekly: Sysco Foods
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-4000, -2000), description: "SYSCO FOODS VANCOUVER", category: "other", merchant_name: "SYSCO FOODS VANCOUVER", is_recurring: 1, type: "debit" });
  }

  // Quarterly (Oct, Jan): CRA Tax Installment
  const quarterlyDates = ["2025-10-15", "2026-01-15"];
  for (const d of quarterlyDates) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -3500, description: "CRA TAX INSTALLMENT", category: "other", merchant_name: "CRA", is_recurring: 0, type: "pad" });
  }
}

// ── c004 - Aisha Okafor ───────────────────────────────────────────────
function seedC004() {
  const cid = "c004";
  const cnum = "004";
  let txCount = 0;

  // Biweekly salary - first 4 months (Sep-Dec) at $6200
  const bwDates = biweeklyDates();
  const first4MonthsBW = bwDates.filter((d) => d < "2026-01-01"); // Sep-Dec = 8 entries
  const last2MonthsBW = bwDates.filter((d) => d >= "2026-01-01"); // Jan-Feb = 4 entries

  for (const d of first4MonthsBW) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 6200, description: "DIRECT DEP - CENOVUS ENERGY", category: "salary_deposit", merchant_name: "CENOVUS ENERGY", is_recurring: 1, type: "direct-deposit" });
  }

  // Biweekly salary - last 2 months (Jan-Feb) at $7115 (raise)
  for (const d of last2MonthsBW) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 7115, description: "DIRECT DEP - CENOVUS ENERGY", category: "salary_deposit", merchant_name: "CENOVUS ENERGY", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: RBC Dominion Securities
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -3000, description: "RBC DOMINION SECURITIES", category: "investment_competitor", merchant_name: "RBC DOMINION SECURITIES", is_recurring: 1, type: "pad" });
  }

  // Monthly: RBC Mortgage
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2400, description: "RBC ROYAL MORTGAGE", category: "mortgage_payment", merchant_name: "RBC ROYAL MORTGAGE", is_recurring: 1, type: "pad" });
  }

  // Monthly: ATCO Gas
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -160, description: "ATCO GAS", category: "utilities", merchant_name: "ATCO GAS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Shaw Cable
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -130, description: "SHAW CABLE", category: "subscription", merchant_name: "SHAW CABLE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Great-West Life
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -175, description: "GREAT-WEST LIFE INS", category: "insurance_premium", merchant_name: "GREAT-WEST LIFE INS", is_recurring: 1, type: "pad" });
  }

  // Biweekly: Costco groceries
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-350, -200), description: "COSTCO WHOLESALE #234", category: "groceries", merchant_name: "COSTCO WHOLESALE #234", is_recurring: 0, type: "debit" });
  }
}

// ── c005 - Sarah MacDonald ────────────────────────────────────────────
function seedC005() {
  const cid = "c005";
  const cnum = "005";
  let txCount = 0;

  // Monthly: CPP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 1200, description: "SERVICE CANADA CPP", category: "government_deposit", merchant_name: "SERVICE CANADA", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: OAS
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 730, description: "SERVICE CANADA OAS", category: "government_deposit", merchant_name: "SERVICE CANADA", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: NS Health Auth Pension
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 2100, description: "DIRECT DEP - NS HEALTH AUTH PENSION", category: "salary_deposit", merchant_name: "NS HEALTH AUTH", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: BMO Mutual Funds
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -800, description: "BMO MUTUAL FUNDS PAD", category: "investment_competitor", merchant_name: "BMO MUTUAL FUNDS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Medavie Blue Cross
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -220, description: "MEDAVIE BLUE CROSS", category: "insurance_premium", merchant_name: "MEDAVIE BLUE CROSS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Nova Scotia Power
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -140, description: "NOVA SCOTIA POWER", category: "utilities", merchant_name: "NOVA SCOTIA POWER", is_recurring: 1, type: "pad" });
  }

  // Monthly: Bell Aliant
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -85, description: "BELL ALIANT", category: "subscription", merchant_name: "BELL ALIANT", is_recurring: 1, type: "pad" });
  }

  // Weekly: Sobeys groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-120, -80), description: "SOBEYS #890", category: "groceries", merchant_name: "SOBEYS #890", is_recurring: 0, type: "debit" });
  }

  // ~6 random: Shoppers Drug Mart
  for (const d of randomDates(6)) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-80, -40), description: "SHOPPERS DRUG MART", category: "healthcare", merchant_name: "SHOPPERS DRUG MART", is_recurring: 0, type: "debit" });
  }
}

// ── c006 - Raj Patel ──────────────────────────────────────────────────
function seedC006() {
  const cid = "c006";
  const cnum = "006";
  let txCount = 0;

  // Monthly: Practice income
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 17500, description: "INTERAC E-TRF PATEL DENTAL PROF CORP", category: "salary_deposit", merchant_name: "PATEL DENTAL PROF CORP", is_recurring: 1, type: "e-transfer" });
  }

  // Monthly: Sun Life RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -3000, description: "SUN LIFE FINANCIAL GRP RRSP", category: "rrsp_contribution", merchant_name: "SUN LIFE FINANCIAL", is_recurring: 1, type: "pad" });
  }

  // Monthly: Manulife Securities
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2200, description: "MANULIFE SECURITIES PAD", category: "investment_competitor", merchant_name: "MANULIFE SECURITIES", is_recurring: 1, type: "pad" });
  }

  // Monthly: Sun Life Disability
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -380, description: "SUN LIFE DISABILITY INS", category: "insurance_premium", merchant_name: "SUN LIFE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Manitoba Hydro
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -175, description: "MANITOBA HYDRO", category: "utilities", merchant_name: "MANITOBA HYDRO", is_recurring: 1, type: "pad" });
  }

  // Monthly: Shaw Cable
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -110, description: "SHAW CABLE", category: "subscription", merchant_name: "SHAW CABLE", is_recurring: 1, type: "pad" });
  }

  // Monthly: TD Mortgage
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -3200, description: "TD MORTGAGE PAD", category: "mortgage_payment", merchant_name: "TD MORTGAGE", is_recurring: 1, type: "pad" });
  }

  // Biweekly: Superstore groceries
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-250, -150), description: "SUPERSTORE #456", category: "groceries", merchant_name: "SUPERSTORE #456", is_recurring: 0, type: "debit" });
  }

  // One-time (Dec 2025): Henry Schein dental supply
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-12-10", amount: -12000, description: "HENRY SCHEIN DENTAL SUPPLY", category: "other", merchant_name: "HENRY SCHEIN DENTAL SUPPLY", is_recurring: 0, type: "debit" });

  // Quarterly (Oct, Jan): CRA Tax Installment
  for (const d of ["2025-10-15", "2026-01-15"]) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -8500, description: "CRA TAX INSTALLMENT", category: "other", merchant_name: "CRA", is_recurring: 0, type: "pad" });
  }
}

// ── c007 - Emily Larsen ───────────────────────────────────────────────
function seedC007() {
  const cid = "c007";
  const cnum = "007";
  let txCount = 0;

  // Biweekly salary - first 3 months (Sep-Nov) from University of Ottawa
  const bwDates = biweeklyDates();
  const first3BW = bwDates.filter((d) => d < "2025-12-01");
  const last3BW = bwDates.filter((d) => d >= "2025-12-01");

  for (const d of first3BW) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 2800, description: "DIRECT DEP - UNIV OF OTTAWA", category: "salary_deposit", merchant_name: "UNIV OF OTTAWA", is_recurring: 1, type: "direct-deposit" });
  }

  // Biweekly salary - last 3 months (Dec-Feb) from Treasury Board
  for (const d of last3BW) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 3654, description: "DIRECT DEP - TREASURY BOARD CANADA", category: "salary_deposit", merchant_name: "TREASURY BOARD CANADA", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: National Bank RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -400, description: "NATIONAL BANK DIRECT RRSP", category: "rrsp_contribution", merchant_name: "NATIONAL BANK", is_recurring: 1, type: "pad" });
  }

  // Monthly: Urbandale Mortgage
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -1600, description: "URBANDALE CONSTRUCTION MTG", category: "mortgage_payment", merchant_name: "URBANDALE CONSTRUCTION", is_recurring: 1, type: "pad" });
  }

  // Monthly: Hydro Ottawa
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -95, description: "HYDRO OTTAWA", category: "utilities", merchant_name: "HYDRO OTTAWA", is_recurring: 1, type: "pad" });
  }

  // Monthly: Rogers Wireless
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -70, description: "ROGERS WIRELESS", category: "subscription", merchant_name: "ROGERS WIRELESS", is_recurring: 1, type: "pad" });
  }

  // Monthly (first 4 months, Sep-Dec): Student Loan
  const first4Months = ["2025-09-15", "2025-10-15", "2025-11-15", "2025-12-15"];
  for (const d of first4Months) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -320, description: "NSLSC STUDENT LOAN", category: "loan_payment", merchant_name: "NSLSC", is_recurring: 1, type: "pad" });
  }

  // Weekly: Farm Boy groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-100, -60), description: "FARM BOY OTTAWA", category: "groceries", merchant_name: "FARM BOY OTTAWA", is_recurring: 0, type: "debit" });
  }
}

// ── c008 - David Kim ──────────────────────────────────────────────────
function seedC008() {
  const cid = "c008";
  const cnum = "008";
  let txCount = 0;

  // Biweekly: TA salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 1100, description: "DIRECT DEP - UNIV TORONTO TA", category: "salary_deposit", merchant_name: "UNIV TORONTO", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: Questwealth TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -100, description: "QUESTWEALTH PORTFOLIOS TFSA", category: "tfsa_contribution", merchant_name: "QUESTWEALTH PORTFOLIOS", is_recurring: 1, type: "pad" });
  }

  // Monthly (Sep to Jan only, NOT Feb): Student Loan
  const sepToJan = ["2025-09-15", "2025-10-15", "2025-11-15", "2025-12-15", "2026-01-15"];
  for (const d of sepToJan) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -280, description: "NSLSC STUDENT LOAN", category: "loan_payment", merchant_name: "NSLSC", is_recurring: 1, type: "pad" });
  }

  // Monthly: Fido Mobile
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -45, description: "FIDO MOBILE", category: "subscription", merchant_name: "FIDO MOBILE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Toronto Hydro
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -60, description: "TORONTO HYDRO", category: "utilities", merchant_name: "TORONTO HYDRO", is_recurring: 1, type: "pad" });
  }

  // Monthly: Rent
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -850, description: "INTERAC E-TRF RENT", category: "rent", merchant_name: "RENT", is_recurring: 1, type: "e-transfer" });
  }

  // Weekly: No Frills groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-70, -40), description: "NO FRILLS #789", category: "groceries", merchant_name: "NO FRILLS #789", is_recurring: 0, type: "debit" });
  }

  // ~10 random: Uber Eats
  for (const d of randomDates(10)) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-30, -15), description: "UBER EATS", category: "dining", merchant_name: "UBER EATS", is_recurring: 0, type: "debit" });
  }
}

// ── c009 - Fatima Hassan ──────────────────────────────────────────────
function seedC009() {
  const cid = "c009";
  const cnum = "009";
  let txCount = 0;

  // Biweekly: Salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 4808, description: "DIRECT DEP - SHOPPERS DRUG MART CORP", category: "salary_deposit", merchant_name: "SHOPPERS DRUG MART CORP", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: Scotiabank Mortgage
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2100, description: "SCOTIABANK MTG PAD", category: "mortgage_payment", merchant_name: "SCOTIABANK", is_recurring: 1, type: "pad" });
  }

  // NO investment transactions (this is the signal!)

  // Monthly: EPCOR Utilities
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -170, description: "EPCOR UTILITIES", category: "utilities", merchant_name: "EPCOR UTILITIES", is_recurring: 1, type: "pad" });
  }

  // Monthly: Telus Mobility
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -90, description: "TELUS MOBILITY", category: "subscription", merchant_name: "TELUS MOBILITY", is_recurring: 1, type: "pad" });
  }

  // Monthly: Sun Life Health Ins
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -160, description: "SUN LIFE HEALTH INS", category: "insurance_premium", merchant_name: "SUN LIFE", is_recurring: 1, type: "pad" });
  }

  // Weekly: Superstore groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-180, -100), description: "SUPERSTORE #321", category: "groceries", merchant_name: "SUPERSTORE #321", is_recurring: 0, type: "debit" });
  }

  // One-time (Nov 2025): Estate transfer
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-11-20", amount: 25000, description: "INTERAC E-TRF ESTATE OF M HASSAN", category: "large_transfer", merchant_name: "ESTATE OF M HASSAN", is_recurring: 0, type: "e-transfer" });

  // ~4 random: Amazon
  for (const d of randomDates(4)) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-80, -20), description: "AMAZON.CA", category: "shopping", merchant_name: "AMAZON.CA", is_recurring: 0, type: "debit" });
  }
}

// ── c010 - James Whitehorse ───────────────────────────────────────────
function seedC010() {
  const cid = "c010";
  const cnum = "010";
  let txCount = 0;

  // Biweekly: Salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 3769, description: "DIRECT DEP - DIAVIK DIAMOND MINES", category: "salary_deposit", merchant_name: "DIAVIK DIAMOND MINES", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: WS Savings Transfer
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -1500, description: "WS SAVINGS TRANSFER", category: "other", merchant_name: "WEALTHSIMPLE", is_recurring: 1, type: "eft" });
  }

  // NO investment transactions (signal: high savings, zero investments)

  // Monthly: Northwestel
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -120, description: "NORTHWESTEL", category: "subscription", merchant_name: "NORTHWESTEL", is_recurring: 1, type: "pad" });
  }

  // Monthly: NTPC Utilities
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -250, description: "NTPC UTILITIES", category: "utilities", merchant_name: "NTPC UTILITIES", is_recurring: 1, type: "pad" });
  }

  // Monthly: Partner transfer
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2000, description: "INTERAC E-TRF PARTNER", category: "other", merchant_name: "PARTNER", is_recurring: 1, type: "e-transfer" });
  }

  // Weekly: Independent Grocer
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-160, -100), description: "INDEPENDENT GROCER YK", category: "groceries", merchant_name: "INDEPENDENT GROCER YK", is_recurring: 0, type: "debit" });
  }

  // Biweekly: Co-op Gas Bar
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-280, -200), description: "CO-OP GAS BAR", category: "transportation", merchant_name: "CO-OP GAS BAR", is_recurring: 0, type: "debit" });
  }

  // ~4 random: Canadian Tire
  for (const d of randomDates(4)) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-100, -30), description: "CANADIAN TIRE", category: "shopping", merchant_name: "CANADIAN TIRE", is_recurring: 0, type: "debit" });
  }
}

// ── Run all transaction seeds inside a transaction ─────────────────────

const seedAllTransactions = db.transaction(() => {
  seedC001();
  seedC002();
  seedC003();
  seedC004();
  seedC005();
  seedC006();
  seedC007();
  seedC008();
  seedC009();
  seedC010();
});
seedAllTransactions();

// ── Insert lead_status rows ────────────────────────────────────────────

const now = new Date().toISOString();
const seedLeadStatus = db.transaction(() => {
  for (const c of clients) {
    insertLeadStatus.run({
      client_id: c.id,
      status: "new",
      last_updated: now,
    });
  }
});
seedLeadStatus();

// ── Summary ────────────────────────────────────────────────────────────

console.log(`Seeded ${clients.length} clients and ${totalTransactions} transactions`);

db.close();
