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

-- ============================================================
-- Onboarding docs (shown to every new non-patron on first login)
-- Extras only see docs with for_extras = true
-- ============================================================

/*
insert into public.onboarding_docs (title, content, category, required, for_extras, sort_order) values
  (
    'Règlement intérieur',
    E'Bienvenue chez Le Hive !\n\nQuelques règles de base pour que tout se passe bien :\n\n• Arriver 10 min avant ta prise de service, en tenue\n• Téléphone dans la poche pendant le service — pas sur la table, pas derrière le bar\n• Pause : 15 min par shift de 6h, coordonne avec ton responsable\n• Pas d''alcool avant ou pendant le service\n• Fumer uniquement côté rue, jamais côté terrasse client\n• Respect entre collègues, respect des clients — zéro tolérance pour harcèlement ou propos discriminants\n\nEn cas de doute ou de conflit : parle au responsable du service en premier. Sinon, contacte directement Nicolas ou Sophie.',
    'rules',
    true,
    true,
    1
  ),
  (
    'Tenue et présentation',
    E'Tenue standard :\n• T-shirt ou chemise noir, propre, repassé\n• Pantalon noir ou jean foncé\n• Chaussures fermées, noires de préférence\n• Cheveux attachés si longs\n• Bijoux discrets uniquement\n\nTablier fourni sur place.\n\nLe vestiaire est à l''arrière — laisse tes affaires en sécurité dans un casier.',
    'uniform',
    true,
    true,
    2
  ),
  (
    'Sécurité et premiers secours',
    E'Numéros d''urgence :\n• SAMU : 15\n• Pompiers : 18\n• Police : 17\n• Numéro unique européen : 112\n\nDans l''établissement :\n• Trousse de premiers secours : derrière le bar, étagère du haut\n• Extincteur : près de la porte de la réserve et en cuisine\n• Issues de secours : porte de derrière, sortie terrasse\n\nEn cas d''incident (blessure, malaise client, bagarre) : préviens immédiatement le responsable, puis appelle les secours si nécessaire. N''interviens jamais seul sur un conflit physique.',
    'safety',
    true,
    true,
    3
  ),
  (
    'Utilisation de la caisse (POS)',
    E'Formation POS à faire avec Benjamin ou le responsable en service avant ta première prise en autonomie.\n\nPoints clés :\n• Chaque ticket = un client ou une table\n• Pas de cumul de plusieurs tables sur un même ticket\n• Offrir/remise : doit être validé par le responsable\n• Fin de service : clôturer ta caisse, compter le fond, signer le bordereau\n\nEn cas d''erreur : ne panique pas, appelle le responsable.',
    'pos',
    false,
    false,
    4
  ),
  (
    'Contrat de travail',
    E'Ton contrat est à signer avec Nicolas (ou envoyé par email via signature électronique).\n\nDocuments requis avant ta première paie :\n• Pièce d''identité\n• RIB\n• Justificatif de domicile (moins de 3 mois)\n• Copie carte vitale (numéro SS)\n• Autorisation de travail si applicable\n\nEnvoie ces documents à lehivebar@gmail.com ou remets-les en main propre.',
    'contract',
    true,
    false,
    5
  );
*/
