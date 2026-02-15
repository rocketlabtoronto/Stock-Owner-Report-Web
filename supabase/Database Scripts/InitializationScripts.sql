-- 🔄 Drop table if it exists (this will also remove comments, policies, etc.)
DROP TABLE IF EXISTS users;
-- ✅ Recreate the table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  stripe_client_id TEXT,
  is_subscribed BOOLEAN DEFAULT false,
  subscription_interval TEXT CHECK (subscription_interval IN ('month', 'year')),
  password_hash TEXT,
  last_payment_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
-- 🔐 Enable Row-Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 💬 Reapply column comments
COMMENT ON COLUMN users.id IS 'Unique identifier (UUID) for each client. Stripe has a different id.';
COMMENT ON COLUMN users.email IS 'This email address is retrieved from Stripe. LookThroughProfits uses the same email address.';
COMMENT ON COLUMN users.email IS 'This phone is retrieved from Stripe. LookThroughProfits uses the same phone.';
COMMENT ON COLUMN users.stripe_client_id IS 'Customer ID in Stripe for payment tracking.';
COMMENT ON COLUMN users.subscription_interval IS 'Valid: Monthly, Yearly';
COMMENT ON COLUMN users.last_payment_at IS 'Last client payment timestamp.';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the user was created.';

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their data" ON users;
-- 👁️ Allow users to view their own data
CREATE POLICY "Users can view their data"
ON users
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update themselves" ON users;
-- 🛠️ Allow users to update their own data
CREATE POLICY "Users can update themselves"
ON users
FOR UPDATE
USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE '[TRIGGER] New auth user ID: %', NEW.id;

  BEGIN
    INSERT INTO public.users (id, email, last_payment_at)
    VALUES (NEW.id, NEW.email, now());
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '[TRIGGER ERROR] %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔔 Recreate the trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

CREATE TABLE webhook_errors (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,  
  email TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message TEXT NOT NULL,
  step INTEGER NOT NULL
);

TRUNCATE public.users;
TRUNCATE public.webhook_errors;

create policy "Allow insert for all"
on users for insert
using (true);

SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;

-- Ensure your function and table allow the trigger to operate with enough privileges:
-- Also ensure that public.users has INSERT permission for the function owner.