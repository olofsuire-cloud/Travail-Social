# PRD — Makandal · Programme de Travail social (LMS)

## Problème original
"Mettre en ligne uniquement le programme de travail social (extrait de la plateforme Makandal). Un compte administrateur peut ajouter des enseignants et étudiants pour chaque cours. Enseignants et admin peuvent ajouter du contenu aux cours. L'admin peut tout modifier." + question sur la publication via GitHub.

## Architecture
- Backend: FastAPI + MongoDB (motor). Auth JWT via cookies httpOnly (bcrypt). 47 cours de travail social + méta programme seedés depuis `backend/data/travail_social.json` (extraits du fichier Makandal original).
- Frontend: Vite + React 19 + Tailwind v4 + shadcn/ui. Thème clair/sombre. Identité Makandal (bleu ciel + ocre, Cormorant Garamond).
- Rôles: admin / enseignant / etudiant.

## Personas
- Admin: gère comptes + assigne cours + édite tout.
- Enseignant: édite le contenu de SES cours assignés, note les devoirs, forum.
- Étudiant: consulte ses cours assignés, suit sa progression, soumet des devoirs, forum.

## Implémenté (2026-06)
- Auth JWT (login/logout/me/refresh), seed admin idempotent (olofsuire@gmail.com).
- Gestion utilisateurs admin: CRUD + assignation de cours par cases à cocher.
- Catalogue public (hero + filtres année/axe + recherche), détail de cours (séances en accordéon, objectifs, ressources).
- Édition de contenu de cours (admin: tous ; enseignant: assignés) avec contrôle d'accès.
- Progression étudiant (cases à cocher persistées), forum par cours, soumission + notation des devoirs.
- Thème clair/sombre persistant. Tests e2e 20/20 backend + UI OK.

## Backlog / prochaines étapes
- P1: Upload de vrais fichiers (PDF/vidéos) via object storage (actuellement liens placeholder hérités de Makandal).
- P1: Remplacer window.prompt de notation par un modal.
- P2: Notifications email (nouveau compte, devoir noté) via Resend.
- P2: data-testid sur options du Select de rôle ; gating auth de /api/program.
- P2: Tableau de bord enseignant/étudiant enrichi (stats devoirs à corriger).
