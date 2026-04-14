-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  uid text primary key,
  email text not null,
  name text not null default '',
  is_admin boolean not null default false,
  avatar_url text not null default '',
  bio text not null default '',
  year_level text not null default '1',
  major text not null default '',
  semester text not null default '',
  user_role text not null default '',
  selected_courses text[] not null default '{}',
  course_roles jsonb not null default '{}'::jsonb,
  has_seen_onboarding boolean not null default false,
  notifications_last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists avatar_url text not null default '';

alter table public.users
  add column if not exists is_admin boolean not null default false;

alter table public.users
  add column if not exists notifications_last_seen_at timestamptz;

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

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  major text not null,
  year_level text not null,
  semester text not null,
  created_at timestamptz not null default now(),
  unique (name, major, year_level, semester)
);

create table if not exists public.user_courses (
  user_uid text not null references public.users(uid) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  role text not null check (role in ('mentor', 'mentee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_uid, course_id)
);

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_uid text not null references public.users(uid) on delete cascade,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.courses (name, major, year_level, semester)
values
  ('Introduction to Computing', 'BSIT', '1', '1'),
  ('Programming Fundamentals', 'BSIT', '1', '1'),
  ('Discrete Mathematics', 'BSIT', '1', '1'),
  ('Technical Writing', 'BSIT', '1', '1'),
  ('Object-Oriented Programming', 'BSIT', '1', '2'),
  ('Data Structures', 'BSIT', '1', '2'),
  ('Computer Organization', 'BSIT', '1', '2'),
  ('Web Development I', 'BSIT', '1', '2'),
  ('Database Systems', 'BSIT', '2', '1'),
  ('Web Development II', 'BSIT', '2', '1'),
  ('Information Management', 'BSIT', '2', '1'),
  ('Systems Analysis', 'BSIT', '2', '1'),
  ('Network Administration', 'BSIT', '2', '2'),
  ('Mobile Development', 'BSIT', '2', '2'),
  ('IT Project Management', 'BSIT', '2', '2'),
  ('Human-Computer Interaction', 'BSIT', '2', '2'),
  ('Web Application Development', 'BSIT', '3', '1'),
  ('Systems Integration', 'BSIT', '3', '1'),
  ('Cloud Computing', 'BSIT', '3', '1'),
  ('Capstone Project 1', 'BSIT', '3', '1'),
  ('IT Infrastructure', 'BSIT', '3', '2'),
  ('Cybersecurity Fundamentals', 'BSIT', '3', '2'),
  ('DevOps Practices', 'BSIT', '3', '2'),
  ('Internship', 'BSIT', '3', '2'),
  ('Advanced Web Technologies', 'BSIT', '4', '1'),
  ('Enterprise Systems', 'BSIT', '4', '1'),
  ('IT Service Management', 'BSIT', '4', '1'),
  ('Capstone Project 2', 'BSIT', '4', '1'),
  ('Emerging Technologies', 'BSIT', '4', '2'),
  ('IT Governance', 'BSIT', '4', '2'),
  ('Business Analytics', 'BSIT', '4', '2'),
  ('Practicum', 'BSIT', '4', '2'),
  ('Introduction to Programming', 'BSCS', '1', '1'),
  ('Calculus I', 'BSCS', '1', '1'),
  ('Physics I', 'BSCS', '1', '1'),
  ('Discrete Structures', 'BSCS', '1', '1'),
  ('Data Structures & Algorithms', 'BSCS', '1', '2'),
  ('Calculus II', 'BSCS', '1', '2'),
  ('Physics II', 'BSCS', '1', '2'),
  ('Digital Logic Design', 'BSCS', '1', '2'),
  ('Computer Architecture', 'BSCS', '2', '1'),
  ('Algorithm Analysis', 'BSCS', '2', '1'),
  ('Linear Algebra', 'BSCS', '2', '1'),
  ('Software Engineering I', 'BSCS', '2', '1'),
  ('Operating Systems', 'BSCS', '2', '2'),
  ('Database Management', 'BSCS', '2', '2'),
  ('Probability & Statistics', 'BSCS', '2', '2'),
  ('Software Engineering II', 'BSCS', '2', '2'),
  ('Computer Networks', 'BSCS', '3', '1'),
  ('Artificial Intelligence', 'BSCS', '3', '1'),
  ('Theory of Computation', 'BSCS', '3', '1'),
  ('Programming Languages', 'BSCS', '3', '1'),
  ('Machine Learning', 'BSCS', '3', '2'),
  ('Compiler Design', 'BSCS', '3', '2'),
  ('Computer Graphics', 'BSCS', '3', '2'),
  ('Research Methods', 'BSCS', '3', '2'),
  ('Advanced Algorithms', 'BSCS', '4', '1'),
  ('Distributed Systems', 'BSCS', '4', '1'),
  ('Thesis I', 'BSCS', '4', '1'),
  ('Elective I', 'BSCS', '4', '1'),
  ('Parallel Computing', 'BSCS', '4', '2'),
  ('Advanced Machine Learning', 'BSCS', '4', '2'),
  ('Thesis II', 'BSCS', '4', '2'),
  ('Elective II', 'BSCS', '4', '2'),
  ('Fundamentals of IS', 'BSIS', '1', '1'),
  ('Introduction to Programming', 'BSIS', '1', '1'),
  ('Business Mathematics', 'BSIS', '1', '1'),
  ('Accounting Fundamentals', 'BSIS', '1', '1'),
  ('Systems Analysis & Design', 'BSIS', '1', '2'),
  ('Database Fundamentals', 'BSIS', '1', '2'),
  ('Business Statistics', 'BSIS', '1', '2'),
  ('Financial Management', 'BSIS', '1', '2'),
  ('Enterprise Architecture', 'BSIS', '2', '1'),
  ('Advanced Database', 'BSIS', '2', '1'),
  ('Business Process Management', 'BSIS', '2', '1'),
  ('Marketing Management', 'BSIS', '2', '1'),
  ('Information Security', 'BSIS', '2', '2'),
  ('Web-Based Systems', 'BSIS', '2', '2'),
  ('Operations Management', 'BSIS', '2', '2'),
  ('Organizational Behavior', 'BSIS', '2', '2'),
  ('Business Intelligence', 'BSIS', '3', '1'),
  ('Systems Audit', 'BSIS', '3', '1'),
  ('Strategic Management', 'BSIS', '3', '1'),
  ('Capstone Project I', 'BSIS', '3', '1'),
  ('ERP Systems', 'BSIS', '3', '2'),
  ('IT Risk Management', 'BSIS', '3', '2'),
  ('Change Management', 'BSIS', '3', '2'),
  ('Industry Immersion', 'BSIS', '3', '2'),
  ('Data Analytics', 'BSIS', '4', '1'),
  ('IS Strategy & Governance', 'BSIS', '4', '1'),
  ('Innovation Management', 'BSIS', '4', '1'),
  ('Capstone Project II', 'BSIS', '4', '1'),
  ('Digital Transformation', 'BSIS', '4', '2'),
  ('IS Consulting', 'BSIS', '4', '2'),
  ('Entrepreneurship', 'BSIS', '4', '2'),
  ('Practicum', 'BSIS', '4', '2')
on conflict (name, major, year_level, semester) do nothing;

insert into public.user_courses (user_uid, course_id, role)
select
  u.uid,
  c.id,
  e.value
from public.users u
cross join lateral jsonb_each_text(u.course_roles) as e(key, value)
join public.courses c
  on c.name = e.key
where e.value in ('mentor', 'mentee')
on conflict (user_uid, course_id) do update
set role = excluded.role,
    updated_at = now();

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

create table if not exists public.study_group_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  requester_id text not null references public.users(uid) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists public.study_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  sender_id text not null references public.users(uid) on delete cascade,
  sender_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_group_read_states (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id text not null references public.users(uid) on delete cascade,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
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
create index if not exists idx_courses_lookup on public.courses(major, year_level, semester);
create index if not exists idx_user_courses_user on public.user_courses(user_uid);
create index if not exists idx_user_courses_course on public.user_courses(course_id);
create index if not exists idx_admin_logs_created on public.admin_activity_logs(created_at desc);
create index if not exists idx_admin_logs_admin on public.admin_activity_logs(admin_uid, created_at desc);
create index if not exists idx_buddies_owner on public.buddies(owner_id, added_at desc);
create index if not exists idx_groups_members on public.study_groups using gin(member_ids);
create index if not exists idx_group_requests_group on public.study_group_requests(group_id, status, created_at desc);
create index if not exists idx_group_requests_requester on public.study_group_requests(requester_id, status, created_at desc);
create index if not exists idx_group_messages_group on public.study_group_messages(group_id, created_at asc);
create index if not exists idx_group_read_states_group on public.study_group_read_states(group_id, last_seen_at desc);
create index if not exists idx_group_read_states_user on public.study_group_read_states(user_id, updated_at desc);
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
alter table public.courses enable row level security;
alter table public.user_courses enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.buddies enable row level security;
alter table public.study_groups enable row level security;
alter table public.study_group_requests enable row level security;
alter table public.study_group_messages enable row level security;
alter table public.study_group_read_states enable row level security;
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

drop policy if exists courses_auth_read on public.courses;
create policy courses_auth_read on public.courses for select to authenticated using (true);

drop policy if exists courses_admin_insert on public.courses;
create policy courses_admin_insert on public.courses for insert to authenticated
  with check (
    exists (
      select 1
      from public.users u
      where u.uid = auth.uid()::text
        and u.is_admin = true
    )
  );

drop policy if exists courses_admin_update on public.courses;
create policy courses_admin_update on public.courses for update to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.uid = auth.uid()::text
        and u.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.users u
      where u.uid = auth.uid()::text
        and u.is_admin = true
    )
  );

drop policy if exists courses_admin_delete on public.courses;
create policy courses_admin_delete on public.courses for delete to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.uid = auth.uid()::text
        and u.is_admin = true
    )
  );

drop policy if exists user_courses_select on public.user_courses;
create policy user_courses_select on public.user_courses for select to authenticated
  using (user_uid = auth.uid()::text);

drop policy if exists user_courses_insert on public.user_courses;
create policy user_courses_insert on public.user_courses for insert to authenticated
  with check (user_uid = auth.uid()::text);

drop policy if exists user_courses_update on public.user_courses;
create policy user_courses_update on public.user_courses for update to authenticated
  using (user_uid = auth.uid()::text)
  with check (user_uid = auth.uid()::text);

drop policy if exists user_courses_delete on public.user_courses;
create policy user_courses_delete on public.user_courses for delete to authenticated
  using (user_uid = auth.uid()::text);

drop policy if exists admin_logs_select on public.admin_activity_logs;
create policy admin_logs_select on public.admin_activity_logs for select to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.uid = auth.uid()::text
        and u.is_admin = true
    )
  );

drop policy if exists admin_logs_insert on public.admin_activity_logs;
create policy admin_logs_insert on public.admin_activity_logs for insert to authenticated
  with check (
    admin_uid = auth.uid()::text
    and exists (
      select 1
      from public.users u
      where u.uid = auth.uid()::text
        and u.is_admin = true
    )
  );

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

drop policy if exists groups_members_update on public.study_groups;
create policy groups_members_update on public.study_groups for update to authenticated
  using (
    owner_id = auth.uid()::text
    or auth.uid()::text = any(member_ids)
  )
  with check (true);

drop policy if exists group_requests_insert_own on public.study_group_requests;
create policy group_requests_insert_own on public.study_group_requests for insert to authenticated
  with check (requester_id = auth.uid()::text);

drop policy if exists group_requests_select_requester on public.study_group_requests;
create policy group_requests_select_requester on public.study_group_requests for select to authenticated
  using (requester_id = auth.uid()::text);

drop policy if exists group_requests_select_owner on public.study_group_requests;
create policy group_requests_select_owner on public.study_group_requests for select to authenticated
  using (
    exists (
      select 1
      from public.study_groups g
      where g.id = study_group_requests.group_id
        and g.owner_id = auth.uid()::text
    )
  );

drop policy if exists group_requests_update_owner on public.study_group_requests;
create policy group_requests_update_owner on public.study_group_requests for update to authenticated
  using (
    exists (
      select 1
      from public.study_groups g
      where g.id = study_group_requests.group_id
        and g.owner_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1
      from public.study_groups g
      where g.id = study_group_requests.group_id
        and g.owner_id = auth.uid()::text
    )
  );

drop policy if exists group_messages_select_members on public.study_group_messages;
create policy group_messages_select_members on public.study_group_messages for select to authenticated
  using (
    exists (
      select 1
      from public.study_groups g
      where g.id = study_group_messages.group_id
        and (
          g.owner_id = auth.uid()::text
          or auth.uid()::text = any(g.member_ids)
        )
    )
  );

drop policy if exists group_messages_insert_members on public.study_group_messages;
create policy group_messages_insert_members on public.study_group_messages for insert to authenticated
  with check (
    exists (
      select 1
      from public.study_groups g
      where g.id = study_group_messages.group_id
        and (
          g.owner_id = auth.uid()::text
          or auth.uid()::text = any(g.member_ids)
        )
    )
  );

drop policy if exists group_read_states_select_members on public.study_group_read_states;
create policy group_read_states_select_members on public.study_group_read_states for select to authenticated
  using (
    exists (
      select 1
      from public.study_groups g
      where g.id = study_group_read_states.group_id
        and (
          g.owner_id = auth.uid()::text
          or auth.uid()::text = any(g.member_ids)
        )
    )
  );

drop policy if exists group_read_states_upsert_own on public.study_group_read_states;
create policy group_read_states_upsert_own on public.study_group_read_states for insert to authenticated
  with check (
    user_id = auth.uid()::text
    and exists (
      select 1
      from public.study_groups g
      where g.id = study_group_read_states.group_id
        and (
          g.owner_id = auth.uid()::text
          or auth.uid()::text = any(g.member_ids)
        )
    )
  );

drop policy if exists group_read_states_update_own on public.study_group_read_states;
create policy group_read_states_update_own on public.study_group_read_states for update to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

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
