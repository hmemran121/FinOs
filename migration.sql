-- Create categories table
create table if not exists public.categories (
  id text not null primary key,
  user_id uuid references auth.users,
  name text not null,
  icon text not null,
  color text not null,
  type text not null,
  is_global boolean default false,
  parent_id text references public.categories(id),
  is_disabled boolean default false,
  "order" integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Wallets table
create table if not exists public.wallets (
  id text not null primary key,
  user_id uuid references auth.users not null,
  name text not null,
  currency text not null,
  initial_balance numeric default 0,
  channels jsonb default '[]'::jsonb,
  color text not null,
  icon text not null,
  is_primary boolean default false,
  uses_primary_income boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Transactions table
create table if not exists public.transactions (
  id text not null primary key,
  user_id uuid references auth.users not null,
  amount numeric not null,
  date timestamp with time zone not null,
  wallet_id text references public.wallets(id) on delete cascade,
  channel_type text not null,
  category_id text references public.categories(id),
  note text,
  type text not null,
  is_split boolean default false,
  splits jsonb default '[]'::jsonb,
  to_wallet_id text references public.wallets(id) on delete set null,
  to_channel_type text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  name text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.categories enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.profiles enable row level security;

-- Policies for Categories
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view global categories') then
    create policy "Users can view global categories" on public.categories for select using (is_global = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own categories') then
    create policy "Users can view their own categories" on public.categories for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own categories') then
    create policy "Users can insert their own categories" on public.categories for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own categories') then
    create policy "Users can update their own categories" on public.categories for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own categories') then
    create policy "Users can delete their own categories" on public.categories for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Policies for Wallets
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own wallets') then
    create policy "Users can view their own wallets" on public.wallets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own wallets') then
    create policy "Users can insert their own wallets" on public.wallets for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own wallets') then
    create policy "Users can update their own wallets" on public.wallets for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own wallets') then
    create policy "Users can delete their own wallets" on public.wallets for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Policies for Transactions
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own transactions') then
    create policy "Users can view their own transactions" on public.transactions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own transactions') then
    create policy "Users can insert their own transactions" on public.transactions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own transactions') then
    create policy "Users can update their own transactions" on public.transactions for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own transactions') then
    create policy "Users can delete their own transactions" on public.transactions for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Policies for Profiles
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own profile') then
    create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own profile') then
    create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own profile') then
    create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
  end if;
end $$;

-- Create indexes for performance
create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists categories_type_idx on public.categories(type);
create index if not exists categories_is_global_idx on public.categories(is_global);
create index if not exists wallets_user_id_idx on public.wallets(user_id);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_wallet_id_idx on public.transactions(wallet_id);
create index if not exists transactions_date_idx on public.transactions(date);
