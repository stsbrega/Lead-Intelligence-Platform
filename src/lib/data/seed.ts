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
db.exec("DELETE FROM behavioral_engagement");
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
  // ── New Tier B leads ────────────────────────────────────────────────
  { id: "c011", first_name: "Naveen", last_name: "Kapoor", email: "naveen.kapoor@email.com", age: 48, city: "Vancouver", province: "BC", occupation: "Chief Financial Officer", annual_income: 280000, account_open_date: "2024-01-10", total_balance: 185000, direct_deposit_active: 1 },
  { id: "c012", first_name: "Helene", last_name: "Dufresne", email: "helene.dufresne@email.com", age: 55, city: "Montreal", province: "QC", occupation: "Corporate Lawyer", annual_income: 220000, account_open_date: "2023-08-20", total_balance: 200000, direct_deposit_active: 1 },
  { id: "c013", first_name: "Amit", last_name: "Sundaram", email: "amit.sundaram@email.com", age: 50, city: "Richmond Hill", province: "ON", occupation: "Cardiologist", annual_income: 310000, account_open_date: "2023-11-05", total_balance: 210000, direct_deposit_active: 1 },
  { id: "c014", first_name: "Danielle", last_name: "Fournier", email: "danielle.fournier@email.com", age: 44, city: "Ottawa", province: "ON", occupation: "VP of Engineering", annual_income: 250000, account_open_date: "2024-02-15", total_balance: 200000, direct_deposit_active: 1 },
  { id: "c015", first_name: "Wei", last_name: "Chen", email: "wei.chen@email.com", age: 42, city: "Markham", province: "ON", occupation: "Business Owner", annual_income: 180000, account_open_date: "2024-04-10", total_balance: 95000, direct_deposit_active: 1 },
  { id: "c016", first_name: "Yuki", last_name: "Tanaka", email: "yuki.tanaka@email.com", age: 39, city: "Calgary", province: "AB", occupation: "Entrepreneur", annual_income: 150000, account_open_date: "2024-06-20", total_balance: 80000, direct_deposit_active: 1 },
  { id: "c017", first_name: "Tariq", last_name: "Al-Rashid", email: "tariq.alrashid@email.com", age: 46, city: "Mississauga", province: "ON", occupation: "Founder & CEO", annual_income: 200000, account_open_date: "2024-01-25", total_balance: 110000, direct_deposit_active: 1 },
  { id: "c018", first_name: "Sophie", last_name: "Bergeron", email: "sophie.bergeron@email.com", age: 33, city: "Kitchener", province: "ON", occupation: "Product Manager", annual_income: 105000, account_open_date: "2024-07-01", total_balance: 45000, direct_deposit_active: 1 },
  { id: "c019", first_name: "Michael", last_name: "O'Brien", email: "michael.obrien@email.com", age: 37, city: "Edmonton", province: "AB", occupation: "Civil Engineer", annual_income: 115000, account_open_date: "2024-03-18", total_balance: 55000, direct_deposit_active: 1 },
  { id: "c020", first_name: "Amara", last_name: "Diallo", email: "amara.diallo@email.com", age: 30, city: "Winnipeg", province: "MB", occupation: "Marketing Manager", annual_income: 72000, account_open_date: "2024-09-01", total_balance: 28000, direct_deposit_active: 1 },
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

// ── c011 - Naveen Kapoor (Wealth Management) ─────────────────────────
function seedC011() {
  const cid = "c011";
  const cnum = "011";
  let txCount = 0;

  // Biweekly salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 10769, description: "DIRECT DEP - LULULEMON ATHLETICA", category: "salary_deposit", merchant_name: "LULULEMON ATHLETICA", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: RBC Dominion Securities RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -4000, description: "RBC DOMINION SECURITIES RRSP", category: "rrsp_contribution", merchant_name: "RBC DOMINION SECURITIES", is_recurring: 1, type: "pad" });
  }

  // Monthly: CI Investments TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -1500, description: "CI INVESTMENTS TFSA", category: "tfsa_contribution", merchant_name: "CI INVESTMENTS", is_recurring: 1, type: "pad" });
  }

  // Monthly: BC Hydro
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -195, description: "BC HYDRO", category: "utilities", merchant_name: "BC HYDRO", is_recurring: 1, type: "pad" });
  }

  // Monthly: Telus
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -140, description: "TELUS MOBILITY", category: "subscription", merchant_name: "TELUS MOBILITY", is_recurring: 1, type: "pad" });
  }

  // Monthly: Manulife Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -310, description: "MANULIFE FINANCIAL INS", category: "insurance_premium", merchant_name: "MANULIFE FINANCIAL", is_recurring: 1, type: "pad" });
  }

  // One-time: RSU vesting deposit (large transfer ≥$10k)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-11-05", amount: 42000, description: "WIRE TRF RSU VEST LULULEMON", category: "large_transfer", merchant_name: "LULULEMON ATHLETICA", is_recurring: 0, type: "wire" });

  // Weekly: Whole Foods groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-200, -120), description: "WHOLE FOODS MARKET", category: "groceries", merchant_name: "WHOLE FOODS MARKET", is_recurring: 0, type: "debit" });
  }
}

// ── c012 - Helene Dufresne (Wealth Management) ───────────────────────
function seedC012() {
  const cid = "c012";
  const cnum = "012";
  let txCount = 0;

  // Biweekly salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 8462, description: "DIRECT DEP - NORTON ROSE FULBRIGHT", category: "salary_deposit", merchant_name: "NORTON ROSE FULBRIGHT", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: National Bank RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -3500, description: "NATIONAL BANK SECURITIES RRSP", category: "rrsp_contribution", merchant_name: "NATIONAL BANK SECURITIES", is_recurring: 1, type: "pad" });
  }

  // Monthly: Fidelity TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -800, description: "FIDELITY INVESTMENTS TFSA", category: "investment_competitor", merchant_name: "FIDELITY INVESTMENTS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Hydro-Quebec
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -165, description: "HYDRO-QUEBEC", category: "utilities", merchant_name: "HYDRO-QUEBEC", is_recurring: 1, type: "pad" });
  }

  // Monthly: Videotron
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -125, description: "VIDEOTRON LTEE", category: "subscription", merchant_name: "VIDEOTRON LTEE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Sun Life Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -275, description: "SUN LIFE FINANCIAL INS", category: "insurance_premium", merchant_name: "SUN LIFE FINANCIAL", is_recurring: 1, type: "pad" });
  }

  // One-time: Condo sale proceeds (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-10-20", amount: 85000, description: "NOTARY TRF CONDO SALE PROCEEDS", category: "large_transfer", merchant_name: "ME LEBLANC NOTAIRE", is_recurring: 0, type: "wire" });

  // Weekly: IGA groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-160, -90), description: "IGA #892", category: "groceries", merchant_name: "IGA #892", is_recurring: 0, type: "debit" });
  }
}

// ── c013 - Amit Sundaram (Wealth Management) ─────────────────────────
function seedC013() {
  const cid = "c013";
  const cnum = "013";
  let txCount = 0;

  // Biweekly salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 11923, description: "DIRECT DEP - MARKHAM STOUFFVILLE HOSPITAL", category: "salary_deposit", merchant_name: "MARKHAM STOUFFVILLE HOSPITAL", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: CIBC Wood Gundy
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -5000, description: "CIBC WOOD GUNDY RRSP", category: "rrsp_contribution", merchant_name: "CIBC WOOD GUNDY", is_recurring: 1, type: "pad" });
  }

  // Monthly: BMO InvestorLine
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2000, description: "BMO INVESTORLINE TFSA", category: "investment_competitor", merchant_name: "BMO INVESTORLINE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Enbridge Gas
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -210, description: "ENBRIDGE GAS", category: "utilities", merchant_name: "ENBRIDGE GAS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Rogers
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -155, description: "ROGERS CABLE", category: "subscription", merchant_name: "ROGERS CABLE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Great-West Life
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -420, description: "GREAT-WEST LIFE INS", category: "insurance_premium", merchant_name: "GREAT-WEST LIFE", is_recurring: 1, type: "pad" });
  }

  // One-time: Consulting income (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2026-01-10", amount: 35000, description: "WIRE TRF MEDICAL CONSULTING FEE", category: "large_transfer", merchant_name: "SUNNYBROOK HEALTH SCIENCES", is_recurring: 0, type: "wire" });

  // Biweekly: Longos groceries
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-280, -180), description: "LONGOS #45", category: "groceries", merchant_name: "LONGOS #45", is_recurring: 0, type: "debit" });
  }
}

// ── c014 - Danielle Fournier (Wealth Management) ─────────────────────
function seedC014() {
  const cid = "c014";
  const cnum = "014";
  let txCount = 0;

  // Biweekly salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 9615, description: "DIRECT DEP - SHOPIFY INC", category: "salary_deposit", merchant_name: "SHOPIFY INC", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: Scotia iTRADE RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -3500, description: "SCOTIA iTRADE RRSP", category: "rrsp_contribution", merchant_name: "SCOTIA iTRADE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Questrade TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -1000, description: "QUESTRADE TFSA", category: "tfsa_contribution", merchant_name: "QUESTRADE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Hydro Ottawa
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -135, description: "HYDRO OTTAWA", category: "utilities", merchant_name: "HYDRO OTTAWA", is_recurring: 1, type: "pad" });
  }

  // Monthly: Bell Canada
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -130, description: "BELL CANADA", category: "subscription", merchant_name: "BELL CANADA", is_recurring: 1, type: "pad" });
  }

  // Monthly: Canada Life Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -290, description: "CANADA LIFE INS", category: "insurance_premium", merchant_name: "CANADA LIFE", is_recurring: 1, type: "pad" });
  }

  // One-time: Stock options exercise (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-12-15", amount: 55000, description: "WIRE TRF SHOPIFY STOCK OPTION EXERCISE", category: "large_transfer", merchant_name: "SHOPIFY INC", is_recurring: 0, type: "wire" });

  // Weekly: Farm Boy groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-140, -80), description: "FARM BOY OTTAWA", category: "groceries", merchant_name: "FARM BOY OTTAWA", is_recurring: 0, type: "debit" });
  }
}

// ── c015 - Wei Chen (Commercial Banking) ─────────────────────────────
function seedC015() {
  const cid = "c015";
  const cnum = "015";
  let txCount = 0;

  // Monthly: Business revenue deposits (irregular)
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(12000, 18000), description: "INTERAC E-TRF CHEN TECH SOLUTIONS INC", category: "salary_deposit", merchant_name: "CHEN TECH SOLUTIONS INC", is_recurring: 0, type: "e-transfer" });
  }

  // Monthly: RBC RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2500, description: "RBC DIRECT INVESTING RRSP", category: "rrsp_contribution", merchant_name: "RBC DIRECT INVESTING", is_recurring: 1, type: "pad" });
  }

  // Monthly: Business expenses
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -3500, description: "AWS CLOUD SERVICES", category: "business_expense", merchant_name: "AMAZON WEB SERVICES", is_recurring: 1, type: "pad" });
  }

  // Monthly: Office lease
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2800, description: "REGUS OFFICE LEASE MARKHAM", category: "rent", merchant_name: "REGUS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Enbridge Gas
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -145, description: "ENBRIDGE GAS", category: "utilities", merchant_name: "ENBRIDGE GAS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Rogers Business
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -180, description: "ROGERS BUSINESS", category: "subscription", merchant_name: "ROGERS BUSINESS", is_recurring: 1, type: "pad" });
  }

  // One-time: Client contract payment (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-11-20", amount: 28000, description: "WIRE TRF CONTRACT PAYMENT CIBC", category: "large_transfer", merchant_name: "CIBC COMMERCIAL", is_recurring: 0, type: "wire" });

  // Quarterly: CRA tax installments
  for (const d of ["2025-10-15", "2026-01-15"]) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -6000, description: "CRA TAX INSTALLMENT", category: "other", merchant_name: "CRA", is_recurring: 0, type: "pad" });
  }
}

// ── c016 - Yuki Tanaka (Commercial Banking) ──────────────────────────
function seedC016() {
  const cid = "c016";
  const cnum = "016";
  let txCount = 0;

  // Monthly: Business revenue
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(10000, 15000), description: "INTERAC E-TRF TANAKA DESIGN STUDIO", category: "salary_deposit", merchant_name: "TANAKA DESIGN STUDIO", is_recurring: 0, type: "e-transfer" });
  }

  // Monthly: TD Waterhouse RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2000, description: "TD WATERHOUSE RRSP", category: "rrsp_contribution", merchant_name: "TD WATERHOUSE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Business supplies
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-2500, -1500), description: "ADOBE CREATIVE CLOUD PRO", category: "business_expense", merchant_name: "ADOBE SYSTEMS", is_recurring: 1, type: "pad" });
  }

  // Monthly: ATCO Gas
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -155, description: "ATCO GAS", category: "utilities", merchant_name: "ATCO GAS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Telus Business
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -135, description: "TELUS BUSINESS", category: "subscription", merchant_name: "TELUS BUSINESS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Manulife Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -245, description: "MANULIFE BUSINESS INS", category: "insurance_premium", merchant_name: "MANULIFE BUSINESS INS", is_recurring: 1, type: "pad" });
  }

  // One-time: Equipment sale proceeds (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2026-01-08", amount: 18000, description: "WIRE TRF EQUIPMENT SALE", category: "large_transfer", merchant_name: "KIJIJI BUYER", is_recurring: 0, type: "wire" });

  // Quarterly: CRA tax installments
  for (const d of ["2025-10-15", "2026-01-15"]) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -4500, description: "CRA TAX INSTALLMENT", category: "other", merchant_name: "CRA", is_recurring: 0, type: "pad" });
  }

  // Biweekly: Co-op groceries
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-180, -100), description: "CALGARY CO-OP #34", category: "groceries", merchant_name: "CALGARY CO-OP #34", is_recurring: 0, type: "debit" });
  }
}

// ── c017 - Tariq Al-Rashid (Commercial Banking) ─────────────────────
function seedC017() {
  const cid = "c017";
  const cnum = "017";
  let txCount = 0;

  // Monthly: Business revenue
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(14000, 20000), description: "INTERAC E-TRF RASHID LOGISTICS INC", category: "salary_deposit", merchant_name: "RASHID LOGISTICS INC", is_recurring: 0, type: "e-transfer" });
  }

  // Monthly: CIBC Investor's Edge RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -3000, description: "CIBC INVESTORS EDGE RRSP", category: "rrsp_contribution", merchant_name: "CIBC INVESTORS EDGE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Scotiabank TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -1000, description: "SCOTIABANK TFSA PAD", category: "tfsa_contribution", merchant_name: "SCOTIABANK", is_recurring: 1, type: "pad" });
  }

  // Monthly: Fleet expenses
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-4000, -3000), description: "PETRO-CANADA FLEET CARD", category: "business_expense", merchant_name: "PETRO-CANADA", is_recurring: 1, type: "debit" });
  }

  // Monthly: Enbridge Gas
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -180, description: "ENBRIDGE GAS", category: "utilities", merchant_name: "ENBRIDGE GAS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Bell Business
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -165, description: "BELL BUSINESS", category: "subscription", merchant_name: "BELL BUSINESS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Intact Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -520, description: "INTACT INSURANCE COMMERCIAL", category: "insurance_premium", merchant_name: "INTACT INSURANCE", is_recurring: 1, type: "pad" });
  }

  // One-time: Government contract payment (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-12-01", amount: 45000, description: "WIRE TRF GOVT CONTRACT PYMT", category: "large_transfer", merchant_name: "PUBLIC SERVICES CANADA", is_recurring: 0, type: "wire" });

  // Quarterly: CRA tax installments
  for (const d of ["2025-10-15", "2026-01-15"]) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -7000, description: "CRA TAX INSTALLMENT", category: "other", merchant_name: "CRA", is_recurring: 0, type: "pad" });
  }
}

// ── c018 - Sophie Bergeron (Mortgage Lending) ────────────────────────
function seedC018() {
  const cid = "c018";
  const cnum = "018";
  let txCount = 0;

  // Biweekly salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 4038, description: "DIRECT DEP - COMMUNITECH HUB", category: "salary_deposit", merchant_name: "COMMUNITECH HUB", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: TD Mortgage
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -1850, description: "TD CANADA TRUST MORTGAGE", category: "mortgage_payment", merchant_name: "TD CANADA TRUST", is_recurring: 1, type: "pad" });
  }

  // Monthly: Questrade RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -800, description: "QUESTRADE RRSP PAD", category: "rrsp_contribution", merchant_name: "QUESTRADE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Wealthsimple competitor TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -400, description: "TD DIRECT INVESTING TFSA", category: "investment_competitor", merchant_name: "TD DIRECT INVESTING", is_recurring: 1, type: "pad" });
  }

  // Monthly: Kitchener-Wilmot Hydro
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -110, description: "KITCHENER-WILMOT HYDRO", category: "utilities", merchant_name: "KITCHENER-WILMOT HYDRO", is_recurring: 1, type: "pad" });
  }

  // Monthly: Koodo Mobile
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -65, description: "KOODO MOBILE", category: "subscription", merchant_name: "KOODO MOBILE", is_recurring: 1, type: "pad" });
  }

  // Monthly: Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -140, description: "COOPERATORS INS", category: "insurance_premium", merchant_name: "COOPERATORS", is_recurring: 1, type: "pad" });
  }

  // One-time: Bonus deposit (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2026-02-01", amount: 15000, description: "WIRE TRF ANNUAL BONUS COMMUNITECH", category: "large_transfer", merchant_name: "COMMUNITECH HUB", is_recurring: 0, type: "wire" });

  // Weekly: Zehrs groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-110, -70), description: "ZEHRS MARKETS #67", category: "groceries", merchant_name: "ZEHRS MARKETS #67", is_recurring: 0, type: "debit" });
  }
}

// ── c019 - Michael O'Brien (Mortgage Lending) ────────────────────────
function seedC019() {
  const cid = "c019";
  const cnum = "019";
  let txCount = 0;

  // Biweekly salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 4423, description: "DIRECT DEP - AECON GROUP", category: "salary_deposit", merchant_name: "AECON GROUP", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: Scotiabank Mortgage
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -2100, description: "SCOTIABANK MORTGAGE PAD", category: "mortgage_payment", merchant_name: "SCOTIABANK", is_recurring: 1, type: "pad" });
  }

  // Monthly: RBC RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -1200, description: "RBC DIRECT INVESTING RRSP", category: "rrsp_contribution", merchant_name: "RBC DIRECT INVESTING", is_recurring: 1, type: "pad" });
  }

  // Monthly: BMO TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -500, description: "BMO INVESTORLINE TFSA", category: "investment_competitor", merchant_name: "BMO INVESTORLINE", is_recurring: 1, type: "pad" });
  }

  // Monthly: EPCOR Utilities
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -175, description: "EPCOR UTILITIES", category: "utilities", merchant_name: "EPCOR UTILITIES", is_recurring: 1, type: "pad" });
  }

  // Monthly: Telus
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -95, description: "TELUS MOBILITY", category: "subscription", merchant_name: "TELUS MOBILITY", is_recurring: 1, type: "pad" });
  }

  // Monthly: Great-West Life Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -195, description: "GREAT-WEST LIFE INS", category: "insurance_premium", merchant_name: "GREAT-WEST LIFE", is_recurring: 1, type: "pad" });
  }

  // One-time: Inheritance deposit (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-10-25", amount: 32000, description: "INTERAC E-TRF ESTATE OF P OBRIEN", category: "large_transfer", merchant_name: "ESTATE OF P OBRIEN", is_recurring: 0, type: "e-transfer" });

  // Weekly: Superstore groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-130, -80), description: "SUPERSTORE #189", category: "groceries", merchant_name: "SUPERSTORE #189", is_recurring: 0, type: "debit" });
  }
}

// ── c020 - Amara Diallo (Retail Banking) ─────────────────────────────
function seedC020() {
  const cid = "c020";
  const cnum = "020";
  let txCount = 0;

  // Biweekly salary
  for (const d of biweeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: 2769, description: "DIRECT DEP - WAWANESA MUTUAL INS", category: "salary_deposit", merchant_name: "WAWANESA MUTUAL INS", is_recurring: 1, type: "direct-deposit" });
  }

  // Monthly: Scotiabank TFSA
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -500, description: "SCOTIABANK TFSA PAD", category: "tfsa_contribution", merchant_name: "SCOTIABANK", is_recurring: 1, type: "pad" });
  }

  // Monthly: TD RRSP
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -300, description: "TD DIRECT INVESTING RRSP", category: "rrsp_contribution", merchant_name: "TD DIRECT INVESTING", is_recurring: 1, type: "pad" });
  }

  // Monthly: Manitoba Hydro
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -125, description: "MANITOBA HYDRO", category: "utilities", merchant_name: "MANITOBA HYDRO", is_recurring: 1, type: "pad" });
  }

  // Monthly: MTS (Bell)
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -90, description: "BELL MTS", category: "subscription", merchant_name: "BELL MTS", is_recurring: 1, type: "pad" });
  }

  // Monthly: Rent
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -1200, description: "INTERAC E-TRF LANDLORD", category: "rent", merchant_name: "LANDLORD", is_recurring: 1, type: "e-transfer" });
  }

  // Monthly: Insurance
  for (const d of monthDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: -95, description: "WAWANESA MUTUAL INS", category: "insurance_premium", merchant_name: "WAWANESA MUTUAL INS", is_recurring: 1, type: "pad" });
  }

  // One-time: Signing bonus from new job (large transfer)
  txCount++;
  insertTx({ id: txId(cnum, txCount), client_id: cid, date: "2025-09-15", amount: 12000, description: "WIRE TRF SIGNING BONUS WAWANESA", category: "large_transfer", merchant_name: "WAWANESA MUTUAL INS", is_recurring: 0, type: "wire" });

  // Weekly: Safeway groceries
  for (const d of weeklyDates()) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-100, -60), description: "SAFEWAY #412", category: "groceries", merchant_name: "SAFEWAY #412", is_recurring: 0, type: "debit" });
  }

  // ~6 random: Tim Hortons
  for (const d of randomDates(6)) {
    txCount++;
    insertTx({ id: txId(cnum, txCount), client_id: cid, date: d, amount: randomBetween(-12, -5), description: "TIM HORTONS", category: "dining", merchant_name: "TIM HORTONS", is_recurring: 0, type: "debit" });
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
  seedC011();
  seedC012();
  seedC013();
  seedC014();
  seedC015();
  seedC016();
  seedC017();
  seedC018();
  seedC019();
  seedC020();
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

// ── Behavioral engagement data (mock CRM / web analytics signals) ─────
// These 5 leads have strong behavioral engagement that boosts them into Tier A.

const insertBehavioral = db.prepare(`
  INSERT INTO behavioral_engagement (
    client_id, product_page_visits, content_downloads, email_opens, email_clicks,
    form_submissions, branch_visits, chat_engagements, return_visits_last_7d,
    webinar_attendance, referred_by_existing_client, recorded_at
  ) VALUES (
    @client_id, @product_page_visits, @content_downloads, @email_opens, @email_clicks,
    @form_submissions, @branch_visits, @chat_engagements, @return_visits_last_7d,
    @webinar_attendance, @referred_by_existing_client, @recorded_at
  )
`);

const behavioralData = [
  // c001 – Priya Sharma (Senior SWE, retail_banking, behavioral weight 0.30)
  // Heavy digital engagement: researching investment products online, clicks through emails,
  // multiple return visits, active in chat — classic tech-savvy prospect pattern.
  {
    client_id: "c001",
    product_page_visits: 7,
    content_downloads: 2,
    email_opens: 15,
    email_clicks: 5,
    form_submissions: 1,
    branch_visits: 0,
    chat_engagements: 3,
    return_visits_last_7d: 4,
    webinar_attendance: 1,
    referred_by_existing_client: 0,
    recorded_at: "2026-02-20T14:30:00Z",
  },
  // c004 – Aisha Okafor (Petroleum Engineer, retail_banking, behavioral weight 0.30)
  // Webinar attendee who followed up with product research and a consultation form.
  // Referred by a colleague who is an existing Wealthsimple client.
  {
    client_id: "c004",
    product_page_visits: 5,
    content_downloads: 3,
    email_opens: 10,
    email_clicks: 4,
    form_submissions: 1,
    branch_visits: 0,
    chat_engagements: 1,
    return_visits_last_7d: 2,
    webinar_attendance: 2,
    referred_by_existing_client: 1,
    recorded_at: "2026-02-18T09:15:00Z",
  },
  // c011 – Naveen Kapoor (CFO, wealth_management, behavioral weight 0.15)
  // High-touch prospect: branch visit, multiple webinars, downloaded whitepapers,
  // and actively engaging through chat. Referred by existing HNW client.
  {
    client_id: "c011",
    product_page_visits: 6,
    content_downloads: 3,
    email_opens: 12,
    email_clicks: 4,
    form_submissions: 2,
    branch_visits: 1,
    chat_engagements: 2,
    return_visits_last_7d: 3,
    webinar_attendance: 2,
    referred_by_existing_client: 1,
    recorded_at: "2026-02-22T11:00:00Z",
  },
  // c013 – Amit Sundaram (Cardiologist, wealth_management, behavioral weight 0.15)
  // Busy professional: attended a wealth planning webinar, visited branch once,
  // submitted a consultation form. Moderate email engagement.
  {
    client_id: "c013",
    product_page_visits: 4,
    content_downloads: 2,
    email_opens: 8,
    email_clicks: 3,
    form_submissions: 1,
    branch_visits: 1,
    chat_engagements: 1,
    return_visits_last_7d: 2,
    webinar_attendance: 1,
    referred_by_existing_client: 1,
    recorded_at: "2026-02-19T16:45:00Z",
  },
  // c014 – Danielle Fournier (VP Engineering, wealth_management, behavioral weight 0.15)
  // Digital-first executive who progressed to in-person: heavy content consumption online,
  // then booked a wealth planning consultation at the branch. Multiple form submissions
  // (RRSP optimization calculator + portfolio review request). Active email engagement.
  {
    client_id: "c014",
    product_page_visits: 8,
    content_downloads: 3,
    email_opens: 14,
    email_clicks: 6,
    form_submissions: 2,
    branch_visits: 1,
    chat_engagements: 3,
    return_visits_last_7d: 4,
    webinar_attendance: 1,
    referred_by_existing_client: 0,
    recorded_at: "2026-02-21T10:20:00Z",
  },
];

const seedBehavioral = db.transaction(() => {
  for (const b of behavioralData) {
    insertBehavioral.run(b);
  }
});
seedBehavioral();

// ── Summary ────────────────────────────────────────────────────────────

console.log(`Seeded ${clients.length} clients, ${totalTransactions} transactions, and ${behavioralData.length} behavioral engagement records`);

db.close();
