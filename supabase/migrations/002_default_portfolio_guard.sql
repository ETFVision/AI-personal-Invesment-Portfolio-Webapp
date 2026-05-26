-- Prevent more than one active default portfolio per user.

with ranked as (
  select
    id,
    row_number() over (partition by user_id order by created_at asc, id asc) as rn
  from portfolios
  where is_default = true and is_active = true
)
update portfolios
set is_default = false
where id in (select id from ranked where rn > 1);

create unique index if not exists idx_one_default_portfolio_per_user
  on portfolios (user_id)
  where is_default = true and is_active = true;

