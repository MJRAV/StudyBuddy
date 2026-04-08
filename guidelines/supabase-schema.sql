-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  uid text primary key,
  email text not null,
  name text not null default '',
  avatar_url text not null default '',
  bio text not null default '',
  year_level text not null default '1',
  major text not null default '',
  semester text not null default '',
  user_role text not null default '',
  selected_courses text[] not null default '{}',
  course_roles jsonb not null default '{}'::jsonb,
  has_seen_onboarding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists avatar_url text not null default '';

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  role text not null default 'Member',
  last_message text not null default '',
  unread integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id text not null,
  author_name text not null,
  author_role text not null default 'member',
  course text not null default 'General',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.buddies (
  owner_id text not null,
  buddy_id text not null,
  name text not null,
  role text not null default 'Member',
  courses text[] not null default '{}',
  added_at timestamptz not null default now(),
  primary key (owner_id, buddy_id)
);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  course text not null,
  member_ids text[] not null default '{}',
  member_count integer not null default 1,
  next_session text not null default 'TBD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id text not null,
  requester_name text not null,
  target_id text not null,
  target_name text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, target_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  recipient_id text not null,
  sender_name text not null,
  text text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

create index if not exists idx_conversations_owner on public.conversations(owner_id, updated_at desc);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at asc);
create index if not exists idx_posts_created on public.community_posts(created_at desc);
create index if not exists idx_post_likes_post on public.community_post_likes(post_id, created_at desc);
create index if not exists idx_post_comments_post on public.community_post_comments(post_id, created_at asc);
create index if not exists idx_buddies_owner on public.buddies(owner_id, added_at desc);
create index if not exists idx_groups_members on public.study_groups using gin(member_ids);
create index if not exists idx_friend_requests_target on public.friend_requests(target_id, status, created_at desc);
create index if not exists idx_friend_requests_requester on public.friend_requests(requester_id, created_at desc);
create index if not exists idx_direct_messages_pair on public.direct_messages(sender_id, recipient_id, created_at desc);
create index if not exists idx_direct_messages_recipient_read on public.direct_messages(recipient_id, is_read, created_at desc);

alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.buddies enable row level security;
alter table public.study_groups enable row level security;
alter table public.friend_requests enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated using (true);

drop policy if exists users_write on public.users;
create policy users_write on public.users for all to authenticated
  using (uid = auth.uid()::text)
  with check (uid = auth.uid()::text);

drop policy if exists conversations_owner_all on public.conversations;
create policy conversations_owner_all on public.conversations for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

drop policy if exists messages_owner_all on public.messages;
create policy messages_owner_all on public.messages for all to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.owner_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.owner_id = auth.uid()::text
    )
  );

drop policy if exists posts_auth_read on public.community_posts;
create policy posts_auth_read on public.community_posts for select to authenticated using (true);

drop policy if exists posts_author_write on public.community_posts;
create policy posts_author_write on public.community_posts for all to authenticated
  using (author_id = auth.uid()::text)
  with check (author_id = auth.uid()::text);

drop policy if exists post_likes_select on public.community_post_likes;
create policy post_likes_select on public.community_post_likes for select to authenticated using (true);

drop policy if exists post_likes_insert on public.community_post_likes;
create policy post_likes_insert on public.community_post_likes for insert to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists post_likes_delete on public.community_post_likes;
create policy post_likes_delete on public.community_post_likes for delete to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists post_comments_select on public.community_post_comments;
create policy post_comments_select on public.community_post_comments for select to authenticated using (true);

drop policy if exists post_comments_insert on public.community_post_comments;
create policy post_comments_insert on public.community_post_comments for insert to authenticated
  with check (author_id = auth.uid()::text);

drop policy if exists post_comments_update on public.community_post_comments;
create policy post_comments_update on public.community_post_comments for update to authenticated
  using (author_id = auth.uid()::text)
  with check (author_id = auth.uid()::text);

drop policy if exists post_comments_delete on public.community_post_comments;
create policy post_comments_delete on public.community_post_comments for delete to authenticated
  using (author_id = auth.uid()::text);

drop policy if exists buddies_owner_all on public.buddies;
create policy buddies_owner_all on public.buddies for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

drop policy if exists groups_auth_read on public.study_groups;
create policy groups_auth_read on public.study_groups for select to authenticated using (true);

drop policy if exists groups_owner_write on public.study_groups;
create policy groups_owner_write on public.study_groups for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests for select to authenticated
  using (
    requester_id = auth.uid()::text
    or target_id = auth.uid()::text
  );

drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests for insert to authenticated
  with check (
    requester_id = auth.uid()::text
    and requester_id <> target_id
  );

drop policy if exists friend_requests_update on public.friend_requests;
create policy friend_requests_update on public.friend_requests for update to authenticated
  using (
    requester_id = auth.uid()::text
    or target_id = auth.uid()::text
  )
  with check (
    requester_id = auth.uid()::text
    or target_id = auth.uid()::text
  );

drop policy if exists direct_messages_select on public.direct_messages;
create policy direct_messages_select on public.direct_messages for select to authenticated
  using (
    sender_id = auth.uid()::text
    or recipient_id = auth.uid()::text
  );

drop policy if exists direct_messages_insert on public.direct_messages;
create policy direct_messages_insert on public.direct_messages for insert to authenticated
  with check (sender_id = auth.uid()::text);

drop policy if exists direct_messages_update on public.direct_messages;
create policy direct_messages_update on public.direct_messages for update to authenticated
  using (
    sender_id = auth.uid()::text
    or recipient_id = auth.uid()::text
  )
  with check (
    sender_id = auth.uid()::text
    or recipient_id = auth.uid()::text
  );

drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
