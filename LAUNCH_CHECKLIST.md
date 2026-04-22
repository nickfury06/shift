# Le Hive — internal launch checklist

One-time prep before you hand phones to the team. Tick them off in order.

## 1. Supabase project is live

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel prod env
- [ ] All 15 migrations applied (run `supabase/schema.sql` if fresh)
- [ ] RLS enabled on every table (grep `enable row level security` in schema.sql = 20 hits ✓)

## 2. Venue info populated (patron, 5 min)

Log in as patron → **Plus → Réglages → Infos du lieu**. Fill in:

- [ ] Nom du WiFi staff
- [ ] Mot de passe WiFi
- [ ] Vestiaire (e.g. "Couloir arrière, casiers à gauche")
- [ ] Trousse 1er secours (e.g. "Derrière le bar, étagère du haut")
- [ ] Où trouver quoi (verres, sirops, tickets, nappes…)
- [ ] Contacts urgence (Nick 06… · Sophie 06…)

Then scroll up and confirm:

- [ ] F&F fréquence + max par période
- [ ] Heures de service (ouverture 16h, fermeture 1h — or your actual hours)

## 3. Team accounts (patron, 15 min)

Supabase Dashboard → Authentication → Add User (email + temp password, one per staff member).

Then in the app: **Admin → Comptes** → for each staff member:

- [ ] Confirm name
- [ ] Set role (patron / responsable / staff)
- [ ] Set `employment_type` (permanent / extra)
- [ ] For responsable: set `stock_domain` (boissons / vins)
- [ ] `must_change_password = true` for all non-patron accounts (force password reset on first login)

Staff list at Le Hive:
- Nick, Sophie — patron
- Benjamin — responsable (boissons)
- Maxime — responsable (vins)
- Margaux, Clément — staff permanent

## 4. Onboarding docs (patron, 10 min)

Until the docs editor UI exists, run the seed SQL example in `supabase/seed.sql` (the `onboarding_docs` section) in the Supabase SQL editor, adapting copy to your reality.

- [ ] At least "Règlement intérieur" and "Sécurité" are live for extras
- [ ] "Contrat" is live for permanent staff only

## 5. Tasks, rituals, events (patron, 30 min)

- [ ] Open **Admin → Tâches** → add at least 3 ouverture tasks, 2 service tasks, 3 fermeture tasks
- [ ] Assign them to real staff IDs (not `{}`) so "Mes tâches" filter works
- [ ] Open **Admin → Événements** → add this week's rituals (e.g. DJ samedi 22h)

## 6. Floor plan (patron, 10 min)

- [ ] Open **Résas → Plan** (toggle view)
- [ ] Tap pencil to enter edit mode
- [ ] Drag markers so they align with actual table positions on the plan image
- [ ] Positions persist in localStorage — re-do per patron device if needed

## 7. First-shift smoke test (patron + 1 staff, 30 min)

Do one full imaginary shift loop:

- [ ] Patron logs in → no errors on Accueil
- [ ] Patron posts a message "Test — essai de l'app ce soir"
- [ ] Staff logs in → sees onboarding → signs docs → lands on Accueil
- [ ] Staff sees the message banner
- [ ] Staff sees today's tasks filtered to "Mes tâches"
- [ ] Staff toggles a task → haptic buzz on mobile, progress bar moves
- [ ] Patron opens Admin → sees no pending absences (zero-state shows)
- [ ] Staff adds a reservation → appears on Accueil imminent arrivals if within 45 min
- [ ] Staff marks a resa arrived → 1 tap, checkmark, toast
- [ ] Staff signals a stock issue → modal, search, 2 taps
- [ ] Staff writes a debrief → saves → patron sees it in Admin

## 8. Mobile polish test

On an iPhone (Safari) and one Android:

- [ ] "Add to Home Screen" installs as Shift
- [ ] Launches full-screen, no browser chrome
- [ ] Status bar + home-bar don't overlap content
- [ ] Haptics fire on task toggle
- [ ] Dark mode auto-switches with system setting

## 9. Day-of rollout

- [ ] Meeting 30 min before service: walk team through Accueil, Stocks signal, Debrief
- [ ] Nick/Sophie on-call for first 3 shifts — answer questions in person, write down friction points
- [ ] After each shift, open **Admin → Messages équipe** and post "feedback jour 1" — staff drops a line, you collect

## Known items that are intentionally absent for v1

- Push notifications (migration exists, not wired client-side) — intentional, staff phones silent during service
- Analytics page — killed, low-signal for 4 staff
- Multi-venue support — intentional, Le Hive is the first tenant, blueprint extraction comes after
- Error monitoring (Sentry) — skipped for internal launch, add before external clients
- Bulk task edit / CSV import — manual creation is fine at this scale

## After 2 weeks of real use

Collect from team + your own notes:

- Top 3 friction points → fix
- Top 3 unexpected wins → double down
- Features nobody used → remove (do not let feature-graveyard accumulate)

Then start the **blueprint extraction** work described in `README.md` under "Known rough edges" and the agreed priority order.
