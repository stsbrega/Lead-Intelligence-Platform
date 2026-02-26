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
  direct_deposit_active INTEGER DEFAULT 0,
  lead_source TEXT DEFAULT 'internal_banking'
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

CREATE TABLE IF NOT EXISTS advisor_note_analyses (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  notes_text TEXT,
  insights TEXT,
  new_signals TEXT,
  updated_recommendations TEXT,
  summary_addendum TEXT,
  score_adjustment INTEGER DEFAULT 0,
  analyzed_at TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS behavioral_engagement (
  client_id TEXT PRIMARY KEY,
  product_page_visits INTEGER DEFAULT 0,
  content_downloads INTEGER DEFAULT 0,
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  form_submissions INTEGER DEFAULT 0,
  branch_visits INTEGER DEFAULT 0,
  chat_engagements INTEGER DEFAULT 0,
  return_visits_last_7d INTEGER DEFAULT 0,
  webinar_attendance INTEGER DEFAULT 0,
  referred_by_existing_client INTEGER DEFAULT 0,
  recorded_at TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(first_name COLLATE NOCASE, last_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_analyses_score ON analyses(score DESC);
CREATE INDEX IF NOT EXISTS idx_note_analyses_client ON advisor_note_analyses(client_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_client ON behavioral_engagement(client_id);
