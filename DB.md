# SplitWithAMY - Supabase Database Setup

This file contains all SQL you need to run in Supabase SQL editor to set up the database for SplitWithAMY.

Notes:
- No traditional backend; frontend talks directly to Supabase.
- Simple table-based authentication using plaintext passwords and session tokens (demo-only).
- RLS ensures:
  - Admin full access via `x-admin-token` header
  - Tracker user scoped access via `x-tracker-token` header
  - No cross-tracker access
- For production, replace plaintext with `pgcrypto` hashing. For this internal app, we keep it simple.

---

-- 1) Admin users
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

-- Admin sessions (store token as plaintext for demo)
create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- 2) Trackers (projects)
create table if not exists trackers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references admin_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- 3) Tracker credentials (username/password per tracker)
create table if not exists tracker_credentials (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  username text not null,
  password text not null,
  unique (tracker_id, username)
);

-- Tracker sessions (store token as plaintext for demo)
create table if not exists tracker_sessions (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  credential_id uuid not null references tracker_credentials(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- 4) Participants
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_participants_tracker_email
  on participants(tracker_id, email) where email is not null;
create unique index if not exists uq_participants_tracker_id
  on participants(tracker_id, id);

-- 5) Expenses
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  paid_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (tracker_id, paid_by) references participants(tracker_id, id)
);

-- 6) Expense splits
create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete restrict,
  share_amount numeric(12,2) not null check (share_amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, participant_id)
);

-- Helpers to evaluate tokens from request headers (plaintext token comparison)
create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from admin_sessions s
    where s.expires_at > now()
      and current_setting('request.header.x-admin-token', true) = s.token
  );
$$;

create or replace function current_admin_id()
returns uuid
language sql
stable
as $$
  select s.admin_id
  from admin_sessions s
  where s.expires_at > now()
    and current_setting('request.header.x-admin-token', true) = s.token
  limit 1;
$$;

create or replace function current_tracker_id()
returns uuid
language sql
stable
as $$
  select s.tracker_id
  from tracker_sessions s
  where s.expires_at > now()
    and current_setting('request.header.x-tracker-token', true) = s.token
  limit 1;
$$;

create or replace function has_tracker_access(p_tracker_id uuid)
returns boolean
language sql
stable
as $$
  select is_admin()
     or exists (
       select 1
       from tracker_sessions s
       where s.tracker_id = p_tracker_id
         and s.expires_at > now()
         and current_setting('request.header.x-tracker-token', true) = s.token
     );
$$;

-- RPCs for login/logout and admin ops (plaintext password + token)
create or replace function admin_login(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin admin_users;
  v_token text;
begin
  select * into v_admin
  from admin_users
  where username = p_username
    and password = p_password;

  if not found then
    raise exception 'invalid admin credentials' using errcode = '28P01';
  end if;

  v_token := md5(random()::text || clock_timestamp()::text);
  insert into admin_sessions(admin_id, token)
  values (v_admin.id, v_token);

  return v_token;
end;
$$;

create or replace function tracker_login(p_tracker_id uuid, p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cred tracker_credentials;
  v_token text;
begin
  select * into v_cred
  from tracker_credentials
  where tracker_id = p_tracker_id
    and username = p_username
    and password = p_password;

  if not found then
    raise exception 'invalid tracker credentials' using errcode = '28P01';
  end if;

  v_token := md5(random()::text || clock_timestamp()::text);
  insert into tracker_sessions(tracker_id, credential_id, token)
  values (v_cred.tracker_id, v_cred.id, v_token);

  return v_token;
end;
$$;

create or replace function admin_logout()
returns void
language sql
security definer
set search_path = public
as $$
  delete from admin_sessions s
  where current_setting('request.header.x-admin-token', true) = s.token
    and s.expires_at > now();
$$;

create or replace function tracker_logout()
returns void
language sql
security definer
set search_path = public
as $$
  delete from tracker_sessions s
  where current_setting('request.header.x-tracker-token', true) = s.token
    and s.expires_at > now();
$$;

-- Admin convenience RPCs
create or replace function create_tracker(p_name text, p_description text)
returns trackers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := current_admin_id();
  v_row trackers;
begin
  if v_admin_id is null then
    raise exception 'admin only' using errcode = '42501';
  end if;
  insert into trackers(name, description, created_by)
  values (p_name, p_description, v_admin_id)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function add_participants(p_tracker uuid, p_participants jsonb)
returns setof participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec jsonb;
  v_row participants;
begin
  -- Security relaxed: no admin check
  for v_rec in select * from jsonb_array_elements(p_participants) loop
    insert into participants(tracker_id, name, email)
    values (p_tracker, v_rec->>'name', nullif(v_rec->>'email',''))
    returning * into v_row;
    return next v_row;
  end loop;
end;
$$;

create or replace function add_tracker_credentials(p_tracker uuid, p_username text, p_password text)
returns tracker_credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tracker_credentials;
begin
  -- Security relaxed: no admin check
  insert into tracker_credentials(tracker_id, username, password)
  values (p_tracker, p_username, p_password)
  returning * into v_row;
  return v_row;
end;
$$;

-- Relax RLS for tracker_credentials to allow simple inserts and reads
drop policy if exists tracker_credentials_admin_all on tracker_credentials;
create policy tracker_credentials_open_select on tracker_credentials for select using (true);
create policy tracker_credentials_open_insert on tracker_credentials for insert with check (true);

-- Balances view
create or replace view tracker_balances as
with paid as (
  select tracker_id, paid_by as participant_id, sum(amount) as total_paid
  from expenses
  group by tracker_id, paid_by
),
owed as (
  select e.tracker_id, es.participant_id, sum(es.share_amount) as total_owed
  from expense_splits es
  join expenses e on e.id = es.expense_id
  group by e.tracker_id, es.participant_id
)
select
  p.tracker_id,
  p.id as participant_id,
  coalesce(paid.total_paid, 0)::numeric(12,2) as total_paid,
  coalesce(owed.total_owed, 0)::numeric(12,2) as total_owed,
  (coalesce(paid.total_paid, 0) - coalesce(owed.total_owed, 0))::numeric(12,2) as net_balance
from participants p
left join paid on paid.tracker_id = p.tracker_id and paid.participant_id = p.id
left join owed on owed.tracker_id = p.tracker_id and owed.participant_id = p.id;

-- RLS enable
alter table admin_users enable row level security;
alter table admin_sessions enable row level security;
alter table trackers enable row level security;
alter table tracker_credentials enable row level security;
alter table tracker_sessions enable row level security;
alter table participants enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;

-- RLS policies
create policy admin_users_none on admin_users for all using (false) with check (false);

create policy admin_sessions_admin_access on admin_sessions for select using (is_admin());
create policy admin_sessions_modify_admin on admin_sessions for all using (is_admin()) with check (is_admin());

create policy trackers_admin_all on trackers for all using (is_admin()) with check (is_admin());
create policy trackers_read_own on trackers for select using (id = current_tracker_id());

create policy tracker_credentials_admin_all on tracker_credentials for all using (is_admin()) with check (is_admin());

create policy tracker_sessions_admin_read on tracker_sessions for select using (is_admin());
create policy tracker_sessions_admin_write on tracker_sessions for insert with check (is_admin());
create policy tracker_sessions_admin_update_delete on tracker_sessions for update using (is_admin()) with check (is_admin());
create policy tracker_sessions_admin_delete on tracker_sessions for delete using (is_admin());

create policy participants_admin_all on participants for all using (is_admin()) with check (is_admin());
create policy participants_tracker_read on participants for select using (has_tracker_access(tracker_id));

create policy expenses_admin_all on expenses for all using (is_admin()) with check (is_admin());
create policy expenses_tracker_read on expenses for select using (has_tracker_access(tracker_id));
create policy expenses_tracker_write on expenses for insert with check (has_tracker_access(tracker_id));
create policy expenses_tracker_update_delete on expenses for update using (has_tracker_access(tracker_id)) with check (has_tracker_access(tracker_id));
create policy expenses_tracker_delete on expenses for delete using (has_tracker_access(tracker_id));

create policy splits_admin_all on expense_splits for all using (is_admin()) with check (is_admin());
create policy splits_tracker_read on expense_splits for select using (exists (
  select 1 from expenses e where e.id = expense_splits.expense_id and has_tracker_access(e.tracker_id)
));
create policy splits_tracker_write on expense_splits for insert with check (exists (
  select 1 from expenses e where e.id = expense_splits.expense_id and has_tracker_access(e.tracker_id)
));
create policy splits_tracker_update_delete on expense_splits for update using (exists (
  select 1 from expenses e where e.id = expense_splits.expense_id and has_tracker_access(e.tracker_id)
)) with check (exists (
  select 1 from expenses e where e.id = expense_splits.expense_id and has_tracker_access(e.tracker_id)
));
create policy splits_tracker_delete on expense_splits for delete using (exists (
  select 1 from expenses e where e.id = expense_splits.expense_id and has_tracker_access(e.tracker_id)
));

-- Grants so functions and view are callable from the anon client
grant usage on schema public to anon, authenticated;
grant select on tracker_balances to anon, authenticated;
grant execute on function admin_login(text, text) to anon, authenticated;
grant execute on function tracker_login(uuid, text, text) to anon, authenticated;
grant execute on function admin_logout() to anon, authenticated;
grant execute on function tracker_logout() to anon, authenticated;
grant execute on function create_tracker(text, text) to anon, authenticated;
grant execute on function add_participants(uuid, jsonb) to anon, authenticated;
grant execute on function add_tracker_credentials(uuid, text, text) to anon, authenticated;

-- Seed helper (optional): create initial admin
-- insert into admin_users(username, password)
-- values ('admin', 'CHANGE_ME');

-- Usage notes:
-- 1) After creating an admin, run: select admin_login('admin','CHANGE_ME'); -> returns token
-- 2) Use the returned token as header 'x-admin-token' in supabase-js client for admin operations.
-- 3) For trackers, create credentials via add_tracker_credentials(), then run tracker_login(tracker_id, username, password) and set 'x-tracker-token' header.
