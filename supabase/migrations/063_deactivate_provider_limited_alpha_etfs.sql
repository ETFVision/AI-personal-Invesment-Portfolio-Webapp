-- Remove provider-limited / non-US listing ETFs from the active Alpha universe.
-- They remain in the database for audit/history, but are hidden from active
-- universe, watchlist, refresh and coverage workflows.

update instruments
set
  is_active = false,
  updated_at = now()
where upper(symbol) in ('IWDA', 'VWRA', 'VGK', 'URTH', 'VEU', 'THNQ', 'TAN');

update watchlist_items
set
  is_active = false,
  updated_at = now()
where instrument_id in (
  select id
  from instruments
  where upper(symbol) in ('IWDA', 'VWRA', 'VGK', 'URTH', 'VEU', 'THNQ', 'TAN')
);
