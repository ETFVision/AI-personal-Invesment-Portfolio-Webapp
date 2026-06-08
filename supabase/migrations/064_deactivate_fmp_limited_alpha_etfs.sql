-- Remove ETF symbols with stale or incomplete FMP market-history coverage from the active Alpha universe.
-- Preserve historical rows and auditability; only inactive instruments/watchlist entries are hidden from active workflows.

update instruments
set
  is_active = false,
  updated_at = now()
where upper(symbol) in (
  'RHS',
  'RGI',
  'RYH',
  'RYT',
  'RYF',
  'SLY',
  'EWCO',
  'IRBO'
);

update watchlist_items
set
  is_active = false,
  updated_at = now()
where instrument_id in (
  select id
  from instruments
  where upper(symbol) in (
    'RHS',
    'RGI',
    'RYH',
    'RYT',
    'RYF',
    'SLY',
    'EWCO',
    'IRBO'
  )
);
