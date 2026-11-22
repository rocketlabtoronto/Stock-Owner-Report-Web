-- Workspaces (one per sign-in email), reference data for brokerages/exchanges,
-- and the holdings an Upload Portfolio or Connect to Brokerage workspace owns.
-- Public tables are reachable only through Edge Functions using the service role:
-- RLS is on with no policies, and anon/authenticated hold no table privileges,
-- matching the lock_down_public_tables migration.
BEGIN;

-- ---------- Reference data: exchanges ----------
CREATE TABLE IF NOT EXISTS public.exchanges (
  code text NOT NULL,
  display_name text NOT NULL,
  country text,
  CONSTRAINT exchanges_pkey PRIMARY KEY (code)
);

CREATE TABLE IF NOT EXISTS public.exchange_aliases (
  alias text NOT NULL,
  exchange_code text NOT NULL,
  CONSTRAINT exchange_aliases_pkey PRIMARY KEY (alias),
  CONSTRAINT exchange_aliases_exchange_code_fkey FOREIGN KEY (exchange_code)
    REFERENCES public.exchanges (code)
);

-- ---------- Reference data: financial institutions ----------
CREATE TABLE IF NOT EXISTS public.financial_institutions (
  code text NOT NULL,
  display_name text NOT NULL,
  country text,
  CONSTRAINT financial_institutions_pkey PRIMARY KEY (code)
);

CREATE TABLE IF NOT EXISTS public.financial_institution_aliases (
  alias text NOT NULL,
  institution_code text NOT NULL,
  CONSTRAINT financial_institution_aliases_pkey PRIMARY KEY (alias),
  CONSTRAINT financial_institution_aliases_institution_code_fkey FOREIGN KEY (institution_code)
    REFERENCES public.financial_institutions (code)
);

-- ---------- Reference data: non-US ticker directory ----------
-- dashboard.financials / dashboard.stock_prices already cover NASDAQ/NYSE ticker
-- validation. Exchanges without an existing data source (e.g. TSX) are validated
-- against this starter directory instead; expand it as more tickers are needed.
CREATE TABLE IF NOT EXISTS public.ticker_directory (
  exchange_code text NOT NULL,
  ticker text NOT NULL,
  company_name text,
  CONSTRAINT ticker_directory_pkey PRIMARY KEY (exchange_code, ticker),
  CONSTRAINT ticker_directory_exchange_code_fkey FOREIGN KEY (exchange_code)
    REFERENCES public.exchanges (code)
);

-- ---------- Workspaces ----------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email extensions.citext NOT NULL,
  workspace_type text NOT NULL,
  auth_provider text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT workspaces_email_key UNIQUE (email),
  CONSTRAINT workspaces_workspace_type_check
    CHECK (workspace_type IN ('upload_portfolio', 'connect_brokerage'))
);

CREATE TABLE IF NOT EXISTS public.workspace_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  account_name text NOT NULL,
  institution_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT workspace_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_accounts_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces (id) ON DELETE CASCADE,
  CONSTRAINT workspace_accounts_institution_code_fkey FOREIGN KEY (institution_code)
    REFERENCES public.financial_institutions (code),
  CONSTRAINT workspace_accounts_unique UNIQUE (workspace_id, account_name, institution_code)
);

CREATE TABLE IF NOT EXISTS public.workspace_holdings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  exchange_code text NOT NULL,
  ticker text NOT NULL,
  quantity numeric NOT NULL,
  source text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT workspace_holdings_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_holdings_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces (id) ON DELETE CASCADE,
  CONSTRAINT workspace_holdings_account_id_fkey FOREIGN KEY (account_id)
    REFERENCES public.workspace_accounts (id) ON DELETE CASCADE,
  CONSTRAINT workspace_holdings_exchange_code_fkey FOREIGN KEY (exchange_code)
    REFERENCES public.exchanges (code),
  CONSTRAINT workspace_holdings_quantity_check CHECK (quantity > 0),
  CONSTRAINT workspace_holdings_source_check
    CHECK (source IN ('excel_upload', 'brokerage_connection')),
  CONSTRAINT workspace_holdings_unique UNIQUE (account_id, exchange_code, ticker)
);

CREATE INDEX IF NOT EXISTS workspace_accounts_workspace_id_idx
  ON public.workspace_accounts (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_holdings_workspace_id_idx
  ON public.workspace_holdings (workspace_id);

-- ---------- Lock down: RLS on, no policies, no anon/authenticated grants ----------
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_institution_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticker_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_holdings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.exchanges,
  public.exchange_aliases,
  public.financial_institutions,
  public.financial_institution_aliases,
  public.ticker_directory,
  public.workspaces,
  public.workspace_accounts,
  public.workspace_holdings
FROM PUBLIC, anon, authenticated;

-- ---------- Seed: exchanges ----------
INSERT INTO public.exchanges (code, display_name, country) VALUES
  ('NASDAQ', 'Nasdaq', 'US'),
  ('NYSE', 'New York Stock Exchange', 'US'),
  ('TSX', 'Toronto Stock Exchange', 'CA')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.exchange_aliases (alias, exchange_code) VALUES
  ('nasdaq', 'NASDAQ'),
  ('nasdaq gs', 'NASDAQ'),
  ('nasdaq gm', 'NASDAQ'),
  ('nasdaq cm', 'NASDAQ'),
  ('nasdaq stock market', 'NASDAQ'),
  ('nms', 'NASDAQ'),
  ('nyse', 'NYSE'),
  ('new york stock exchange', 'NYSE'),
  ('the new york stock exchange', 'NYSE'),
  ('nyse group', 'NYSE'),
  ('tsx', 'TSX'),
  ('toronto stock exchange', 'TSX'),
  ('tse', 'TSX'),
  ('tsx inc', 'TSX')
ON CONFLICT (alias) DO NOTHING;

-- ---------- Seed: financial institutions (mirrors brokerageData.js) ----------
INSERT INTO public.financial_institutions (code, display_name, country) VALUES
  ('bmo_investorline', 'BMO InvestorLine', 'CA'),
  ('cibc_investors_edge', 'CIBC Investor''s Edge', 'CA'),
  ('national_bank_direct_brokerage', 'National Bank Direct Brokerage', 'CA'),
  ('questrade', 'Questrade', 'CA'),
  ('rbc_direct_investing', 'RBC Direct Investing', 'CA'),
  ('scotia_itrade', 'Scotia iTRADE', 'CA'),
  ('td_direct_investing', 'TD Direct Investing', 'CA'),
  ('wealthsimple', 'Wealthsimple', 'CA'),
  ('charles_schwab', 'Charles Schwab', 'US'),
  ('chase', 'Chase', 'US'),
  ('etrade', 'E*TRADE', 'US'),
  ('fidelity', 'Fidelity', 'US'),
  ('interactive_brokers', 'Interactive Brokers', 'US'),
  ('merrill_edge', 'Merrill Edge', 'US'),
  ('robinhood', 'Robinhood', 'US'),
  ('vanguard', 'Vanguard', 'US'),
  ('wells_fargo', 'Wells Fargo', 'US')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.financial_institution_aliases (alias, institution_code) VALUES
  ('bmo investorline', 'bmo_investorline'),
  ('bmo', 'bmo_investorline'),
  ('bank of montreal', 'bmo_investorline'),
  ('cibc investor''s edge', 'cibc_investors_edge'),
  ('cibc investors edge', 'cibc_investors_edge'),
  ('cibc', 'cibc_investors_edge'),
  ('national bank direct brokerage', 'national_bank_direct_brokerage'),
  ('national bank', 'national_bank_direct_brokerage'),
  ('nbdb', 'national_bank_direct_brokerage'),
  ('questrade', 'questrade'),
  ('rbc direct investing', 'rbc_direct_investing'),
  ('rbc', 'rbc_direct_investing'),
  ('royal bank', 'rbc_direct_investing'),
  ('scotia itrade', 'scotia_itrade'),
  ('scotia', 'scotia_itrade'),
  ('scotiabank', 'scotia_itrade'),
  ('td direct investing', 'td_direct_investing'),
  ('td', 'td_direct_investing'),
  ('td waterhouse', 'td_direct_investing'),
  ('toronto dominion', 'td_direct_investing'),
  ('wealthsimple', 'wealthsimple'),
  ('charles schwab', 'charles_schwab'),
  ('schwab', 'charles_schwab'),
  ('chase', 'chase'),
  ('jpmorgan chase', 'chase'),
  ('e*trade', 'etrade'),
  ('etrade', 'etrade'),
  ('e-trade', 'etrade'),
  ('fidelity', 'fidelity'),
  ('interactive brokers', 'interactive_brokers'),
  ('ibkr', 'interactive_brokers'),
  ('merrill edge', 'merrill_edge'),
  ('merrill', 'merrill_edge'),
  ('merrill lynch', 'merrill_edge'),
  ('bofa', 'merrill_edge'),
  ('bank of america', 'merrill_edge'),
  ('robinhood', 'robinhood'),
  ('vanguard', 'vanguard'),
  ('wells fargo', 'wells_fargo'),
  ('wells fargo advisors', 'wells_fargo')
ON CONFLICT (alias) DO NOTHING;

-- ---------- Seed: TSX starter ticker directory ----------
INSERT INTO public.ticker_directory (exchange_code, ticker, company_name) VALUES
  ('TSX', 'RY', 'Royal Bank of Canada'),
  ('TSX', 'TD', 'The Toronto-Dominion Bank'),
  ('TSX', 'BNS', 'The Bank of Nova Scotia'),
  ('TSX', 'BMO', 'Bank of Montreal'),
  ('TSX', 'CM', 'Canadian Imperial Bank of Commerce'),
  ('TSX', 'NA', 'National Bank of Canada'),
  ('TSX', 'MFC', 'Manulife Financial Corporation'),
  ('TSX', 'SLF', 'Sun Life Financial Inc.'),
  ('TSX', 'GWO', 'Great-West Lifeco Inc.'),
  ('TSX', 'ENB', 'Enbridge Inc.'),
  ('TSX', 'TRP', 'TC Energy Corporation'),
  ('TSX', 'SU', 'Suncor Energy Inc.'),
  ('TSX', 'CNQ', 'Canadian Natural Resources Limited'),
  ('TSX', 'IMO', 'Imperial Oil Limited'),
  ('TSX', 'CVE', 'Cenovus Energy Inc.'),
  ('TSX', 'BAM', 'Brookfield Asset Management Ltd.'),
  ('TSX', 'BN', 'Brookfield Corporation'),
  ('TSX', 'CNR', 'Canadian National Railway Company'),
  ('TSX', 'CP', 'Canadian Pacific Kansas City Limited'),
  ('TSX', 'T', 'TELUS Corporation'),
  ('TSX', 'BCE', 'BCE Inc.'),
  ('TSX', 'RCI.B', 'Rogers Communications Inc.'),
  ('TSX', 'SHOP', 'Shopify Inc.'),
  ('TSX', 'CSU', 'Constellation Software Inc.'),
  ('TSX', 'ATD', 'Alimentation Couche-Tard Inc.'),
  ('TSX', 'L', 'Loblaw Companies Limited'),
  ('TSX', 'MG', 'Magna International Inc.'),
  ('TSX', 'WN', 'George Weston Limited'),
  ('TSX', 'POW', 'Power Corporation of Canada'),
  ('TSX', 'FTS', 'Fortis Inc.'),
  ('TSX', 'EMA', 'Emera Incorporated'),
  ('TSX', 'AQN', 'Algonquin Power & Utilities Corp.'),
  ('TSX', 'K', 'Kinross Gold Corporation'),
  ('TSX', 'ABX', 'Barrick Gold Corporation'),
  ('TSX', 'FNV', 'Franco-Nevada Corporation'),
  ('TSX', 'WPM', 'Wheaton Precious Metals Corp.'),
  ('TSX', 'NTR', 'Nutrien Ltd.'),
  ('TSX', 'TECK.B', 'Teck Resources Limited'),
  ('TSX', 'GIB.A', 'CGI Inc.'),
  ('TSX', 'OTEX', 'Open Text Corporation'),
  ('TSX', 'DOL', 'Dollarama Inc.'),
  ('TSX', 'QSR', 'Restaurant Brands International Inc.')
ON CONFLICT (exchange_code, ticker) DO NOTHING;

COMMIT;
