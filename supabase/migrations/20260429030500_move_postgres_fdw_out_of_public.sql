-- Move postgres_fdw out of public schema if installed there.
create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'postgres_fdw'
      and n.nspname = 'public'
  ) then
    execute 'alter extension postgres_fdw set schema extensions';
  end if;
end
$$;
