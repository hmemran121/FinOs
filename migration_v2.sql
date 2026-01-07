-- Phase 2A - Foundation Intelligence Migration

-- Commitments table
create table if not exists public.commitments (
  id text not null primary key,
  user_id uuid references auth.users not null,
  name text not null,
  amount numeric not null,
  frequency text not null, -- DAILY, WEEKLY, MONTHLY
  certainty_level text not null, -- HARD, SOFT
  type text not null, -- FIXED, VARIABLE, OPTIONAL
  wallet_id text references public.wallets(id) on delete cascade,
  next_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for commitments
alter table public.commitments enable row level security;

-- Policies for Commitments
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own commitments') then
    create policy "Users can view their own commitments" on public.commitments for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own commitments') then
    create policy "Users can insert their own commitments" on public.commitments for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own commitments') then
    create policy "Users can update their own commitments" on public.commitments for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own commitments') then
    create policy "Users can delete their own commitments" on public.commitments for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Index for performance
create index if not exists commitments_user_id_idx on public.commitments(user_id);
create index if not exists commitments_wallet_id_idx on public.commitments(wallet_id);
create index if not exists commitments_next_date_idx on public.commitments(next_date);
