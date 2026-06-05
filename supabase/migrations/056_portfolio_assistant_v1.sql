-- Portfolio Assistant V1.
-- Controlled, portfolio-scoped assistant memory and usage tracking.

create table if not exists assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  portfolio_id uuid references portfolios(id) on delete set null,
  title text not null default 'Portfolio Assistant',
  latest_question_category text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references assistant_conversations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  portfolio_id uuid references portfolios(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  question_category text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  token_usage jsonb not null default '{}'::jsonb,
  cost_estimate numeric(12, 6),
  response_time_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists assistant_usage_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references assistant_conversations(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  portfolio_id uuid references portfolios(id) on delete set null,
  question_category text,
  supported boolean not null default false,
  model_used text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  estimated_cost numeric(12, 6),
  response_time_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_assistant_conversations_user_created
  on assistant_conversations (user_id, created_at desc);
create index if not exists idx_assistant_conversations_portfolio_created
  on assistant_conversations (portfolio_id, created_at desc);
create index if not exists idx_assistant_messages_conversation_created
  on assistant_messages (conversation_id, created_at asc);
create index if not exists idx_assistant_usage_user_created
  on assistant_usage_logs (user_id, created_at desc);

drop trigger if exists trg_assistant_conversations_updated_at on assistant_conversations;
create trigger trg_assistant_conversations_updated_at before update on assistant_conversations for each row execute function set_updated_at();

alter table assistant_conversations enable row level security;
alter table assistant_messages enable row level security;
alter table assistant_usage_logs enable row level security;

drop policy if exists "users can read assistant conversations" on assistant_conversations;
create policy "users can read assistant conversations" on assistant_conversations for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "users can read assistant messages" on assistant_messages;
create policy "users can read assistant messages" on assistant_messages for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "users can read assistant usage logs" on assistant_usage_logs;
create policy "users can read assistant usage logs" on assistant_usage_logs for select using (
  auth.role() = 'authenticated'
);
