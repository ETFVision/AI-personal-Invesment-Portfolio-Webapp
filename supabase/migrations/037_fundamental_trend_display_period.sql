-- Add display-period metadata for fundamental trend UI labels.

alter table fundamental_trends
  add column if not exists display_period text check (display_period in ('annual', 'quarterly')),
  add column if not exists display_window text check (display_window in ('short_term', 'long_term'));
