-- 0005: private storage buckets. Objects stay private; access via signed URLs only.
insert into storage.buckets (id, name, public) values
  ('resumes', 'resumes', false),
  ('avatars', 'avatars', false),
  ('evidence', 'evidence', false)
on conflict (id) do nothing;
