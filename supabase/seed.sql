-- ============================================================
-- Le Hive Management — Seed Data
-- ============================================================
-- NOTE: This seed file inserts profiles directly.
-- In production, users are created via Supabase Auth (auth.users)
-- which triggers the handle_new_user() function to create profiles.
--
-- For local development / initial setup, create users via
-- Supabase Dashboard > Authentication > Add User, then
-- update their profiles with the SQL below.
--
-- Team: Nick, Sophie (patrons), Benjamin, Maxime (responsables),
--        Margaux, Clément (staff)
-- ============================================================

-- After creating auth users in the dashboard, run these updates:
-- (Replace the UUIDs with actual auth.users IDs)

/*
-- Example: Update profiles after auth user creation
update public.profiles set
  name = 'Nick',
  role = 'patron',
  must_change_password = false
where email = 'nick@lehive.staff';

update public.profiles set
  name = 'Sophie',
  role = 'patron',
  must_change_password = false
where email = 'sophie@lehive.staff';

update public.profiles set
  name = 'Benjamin',
  role = 'responsable',
  stock_domain = 'boissons',
  must_change_password = true
where email = 'benjamin.d@lehive.staff';

update public.profiles set
  name = 'Maxime',
  role = 'responsable',
  stock_domain = 'vins',
  must_change_password = true
where email = 'maxime.l@lehive.staff';

update public.profiles set
  name = 'Margaux',
  role = 'staff',
  must_change_password = true
where email = 'margaux.r@lehive.staff';

update public.profiles set
  name = 'Clément',
  role = 'staff',
  must_change_password = true
where email = 'clement.b@lehive.staff';
*/

-- ============================================================
-- Sample recurring tasks (Le Hive daily operations)
-- NOTE: assigned_to UUIDs must be replaced with real profile IDs
-- ============================================================

/*
-- Ouverture tasks
insert into public.tasks (title, note, zone, moment, assigned_to, days, priority, is_reminder, is_libre) values
  ('Mettre en place la terrasse', 'Tables, chaises, nappes — nappes dans le placard sous l''escalier', 'terrasse', 'ouverture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 1, false, false),
  ('Vérifier les stocks bar', 'Compter spiritueux, bières, softs', 'bar_backbar', 'ouverture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 2, false, false),
  ('Nettoyer les toilettes', null, 'terrasse_wc', 'ouverture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 1, false, false),
  ('Mise en place restaurant', 'Couverts, verres, serviettes', 'restaurant', 'ouverture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 1, false, false),
  ('Préparer le bar gaming', null, 'bar_gaming', 'ouverture', '{}', '{"vendredi","samedi"}', 3, false, false),
  ('Vérifier la réserve', 'S''assurer que tout est rangé', 'bar_reserve', 'ouverture', '{}', '{"mercredi"}', 3, false, false);

-- Service tasks
insert into public.tasks (title, note, zone, moment, assigned_to, days, priority, is_reminder, is_libre) values
  ('Accueil des clients', null, 'restaurant', 'service', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 1, true, false),
  ('Vérifier température frigo bar', 'Noter la température sur le carnet', 'bar_backbar', 'service', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 2, false, false);

-- Fermeture tasks
insert into public.tasks (title, note, zone, moment, assigned_to, days, priority, is_reminder, is_libre) values
  ('Ranger la terrasse', null, 'terrasse', 'fermeture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 1, false, false),
  ('Nettoyer le bar', null, 'bar_salle', 'fermeture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 1, false, false),
  ('Fermer la caisse', null, 'restaurant', 'fermeture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 1, false, false),
  ('Sortir les poubelles', null, 'bar_reserve', 'fermeture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 2, false, false);

-- Tâches libres
insert into public.tasks (title, note, zone, moment, assigned_to, days, priority, is_reminder, is_libre) values
  ('Réorganiser la réserve', 'Ranger par catégorie', 'bar_reserve', 'service', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 4, false, true),
  ('Nettoyer les vitres terrasse', null, 'terrasse', 'ouverture', '{}', '{"mardi","mercredi","jeudi","vendredi","samedi"}', 5, false, true);
*/
