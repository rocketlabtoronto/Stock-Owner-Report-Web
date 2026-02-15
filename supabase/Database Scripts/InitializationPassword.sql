-- Table to store reset/setup tokens
create table public.password_reset_tokens (
  email text primary key,
  token text not null,
  expires_at timestamptz not null
);

-- Example field in your public.user table (if not already there)
alter table public.user add column password_hash text;