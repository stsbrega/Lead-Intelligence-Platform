CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  city TEXT,
  province TEXT,
  occupation TEXT,
  annual_income REAL,
  account_open_date TEXT,
  total_balance REAL,
  direct_deposit_active INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  category TEXT,
  merchant_name TEXT,
  is_recurring INTEGER DEFAULT 0,
  type TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  score INTEGER,
  confidence TEXT,
  signals TEXT,
  summary TEXT,
  detailed_reasoning TEXT,
  recommended_actions TEXT,
  human_decision_required TEXT,
  analyzed_at TEXT,
  model_used TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS lead_status (
  client_id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'new',
  advisor_notes TEXT,
  last_updated TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_analyses_score ON analyses(score DESC);
