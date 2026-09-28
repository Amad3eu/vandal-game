-- Vandal Game: players, seeds handed out by the server and verified runs (the leaderboard).
--
-- Row level security is on everywhere. Players can read the public parts and edit their own
-- nickname; seeds and runs are written only by the edge functions (service role), after the
-- run has been replayed with the game's engine.

-- ---------------------------------------------------------------- players
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 20),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "nicknames are public"
  on public.profiles for select
  using (true);

create policy "players create their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "players rename themselves"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------- seeds
-- One per run started (start-run). A run is only accepted with a seed the server handed to
-- that player, used once.
create table public.run_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  seed bigint not null check (seed between 0 and 4294967295),
  mode text not null check (mode in ('runner', 'free')),
  issued_at timestamptz not null default now(),
  used_at timestamptz
);

create index run_seeds_user_issued on public.run_seeds (user_id, issued_at desc);

-- No policies: only the service role (edge functions) reads or writes seeds.
alter table public.run_seeds enable row level security;

-- ---------------------------------------------------------------- runs
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  seed_id uuid not null unique references public.run_seeds (id),
  mode text not null check (mode in ('runner', 'free')),
  engine_version int not null,
  -- The score of the server's replay, not the one the client claimed.
  score int not null check (score >= 0),
  end_tick int not null check (end_tick > 0),
  -- The whole run (seed + inputs per tick): for ghosts, replays and audits.
  log jsonb not null,
  created_at timestamptz not null default now()
);

create index runs_mode_score on public.runs (mode, score desc);
create index runs_user_mode on public.runs (user_id, mode, score desc);

alter table public.runs enable row level security;

create policy "players read their own runs"
  on public.runs for select to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies: submit-run writes runs with the service role.

-- ---------------------------------------------------------------- leaderboard
-- Best verified score per player in a mode. SECURITY DEFINER so anyone can read the ranking
-- without reading the runs table itself (which keeps the logs private).
create function public.leaderboard(p_mode text, p_limit int default 20)
returns table (rank bigint, player_id uuid, nickname text, score int, achieved_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select distinct on (r.user_id) r.user_id, r.score, r.created_at
    from runs r
    where r.mode = p_mode
    order by r.user_id, r.score desc, r.created_at
  )
  select rank() over (order by b.score desc) as rank,
         b.user_id as player_id,
         coalesce(p.nickname, 'Anônimo') as nickname,
         b.score,
         b.created_at as achieved_at
  from best b
  left join profiles p on p.id = b.user_id
  order by b.score desc, b.created_at
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.leaderboard(text, int) from public;
grant execute on function public.leaderboard(text, int) to anon, authenticated;

-- A player's best score and position in a mode (used by submit-run's answer).
create function public.player_standing(p_mode text, p_user uuid)
returns table (rank bigint, best int)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select r.user_id, max(r.score) as score
    from runs r
    where r.mode = p_mode
    group by r.user_id
  )
  select (select count(*) + 1 from best o where o.score > b.score) as rank, b.score as best
  from best b
  where b.user_id = p_user;
$$;

revoke all on function public.player_standing(text, uuid) from public;
grant execute on function public.player_standing(text, uuid) to service_role;
