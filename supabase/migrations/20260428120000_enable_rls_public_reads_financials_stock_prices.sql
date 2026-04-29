BEGIN;

ALTER TABLE dashboard.financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.stock_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financials_read_public ON dashboard.financials;
CREATE POLICY financials_read_public
ON dashboard.financials
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS stock_prices_read_public ON dashboard.stock_prices;
CREATE POLICY stock_prices_read_public
ON dashboard.stock_prices
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE INSERT, UPDATE, DELETE ON dashboard.financials FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON dashboard.stock_prices FROM anon, authenticated;
GRANT SELECT ON dashboard.financials TO anon, authenticated;
GRANT SELECT ON dashboard.stock_prices TO anon, authenticated;

COMMIT;
