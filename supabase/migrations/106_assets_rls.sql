-- Enable RLS on the global instrument reference catalog.
-- Writes remain service-role only (service role bypasses RLS).
alter table assets enable row level security;

create policy "authenticated users can read assets"
  on assets for select
  using (auth.role() = 'authenticated');
