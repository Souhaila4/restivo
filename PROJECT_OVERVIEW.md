# Restivo — Vue d'ensemble du projet

> Document de découverte rédigé à partir de l'analyse du code source (version `0.1.0`).
> Les points marqués **(incertain)** sont des déductions qui n'ont pas pu être vérifiées directement dans le code.

---

## Sommaire

1. [Présentation du projet](#1-présentation-du-projet)
2. [Stack technique](#2-stack-technique)
3. [Architecture du projet](#3-architecture-du-projet)
4. [Démarche et fonctionnement](#4-démarche-et-fonctionnement)
5. [Modèle de données](#5-modèle-de-données)
6. [Installation et lancement](#6-installation-et-lancement)
7. [Tests et qualité](#7-tests-et-qualité)
8. [Points d'amélioration](#8-points-damélioration)
9. [Espace client dynamique (V1)](#9-espace-client-dynamique-v1)
10. [Prochaine étape](#10-prochaine-étape)

---

## 1. Présentation du projet

### Nom et objectif

**Restivo** se présente comme « *The Restaurant Operating System* » (métadonnées de `app/layout.tsx`) :

> « Create your menu, design your tables, manage reservations, and deliver a better dining experience — all from one beautifully connected platform. »

C'est une **application web (PWA) de gestion de restaurants**. Elle réunit dans un même outil ce qu'un restaurateur gère souvent avec plusieurs logiciels : la fiche de l'établissement, le plan de salle, la carte, les promotions, l'équipe et, à terme, les réservations et les commandes.

### Problème résolu

- Centraliser la gestion opérationnelle d'un ou plusieurs restaurants.
- Proposer un **éditeur visuel de plan de salle** (tables, chaises, murs, bar, cuisine…) qui alimente directement les données « tables » utilisées pour les réservations.
- Mettre en relation les **restaurants et le personnel** au moyen d'un système de demandes d'adhésion.
- Offrir un **assistant IA (« AI Manager »)** qui répond aux questions du gérant à partir des vraies données du restaurant.

### Public cible

Le code distingue trois profils, choisis à l'inscription (`app/auth/signup/page.tsx`, `lib/auth/validation.ts`) :

| Profil | Valeur à l'inscription | Ce qu'il peut faire |
|---|---|---|
| **Propriétaire / Gérant** | `owner` → `User.managementRole = OWNER` | Créer et gérer des restaurants, le plan de salle, le menu, les promotions et l'équipe ; utiliser l'assistant IA |
| **Personnel (staff)** | `staff` → `User.managementRole = STAFF` | Demander à rejoindre un restaurant, puis accéder à un espace de travail « service » |
| **Client** | `customer` → `managementRole = null` | Parcourir les restaurants, réserver, gérer ses favoris (interface **maquettée**, voir plus bas) |

Le contexte géographique visé semble être la **Tunisie** : devise par défaut `TND`, fuseau `Africa/Tunis`, données de démonstration à Tunis (Les Berges du Lac, Carthage…). Une page hors ligne est rédigée en français, le reste de l'interface en anglais.

### Fonctionnalités principales

État réel des fonctionnalités observé dans le code :

| Fonctionnalité | État | Où |
|---|---|---|
| Inscription / connexion (email + mot de passe, JWT) | ✅ Fonctionnelle (API + BDD) | `app/api/auth/*`, `lib/auth/*` |
| Édition du profil utilisateur | ✅ Fonctionnelle | `PATCH /api/auth/profile`, `app/mainpage/profile` |
| Création de restaurant (assistant multi-étapes : infos, horaires, premier étage) | ✅ Fonctionnelle | `POST /api/restaurants`, `AddRestaurantModal.tsx` |
| Gestion des étages et éditeur de plan de salle 2D | ✅ Fonctionnelle | `/api/restaurants/:id/floors/*`, `tables/_components/floor-plan/` |
| Menu : catégories, plats, publication | ✅ Fonctionnelle | `/api/restaurants/:id/menu/*` |
| Promotions (pourcentage / montant fixe, liées à des plats) | ✅ Fonctionnelle | `/api/restaurants/:id/promotions/*` |
| Équipe : demandes d'adhésion du personnel, acceptation / refus | ✅ Fonctionnelle | `/api/staff/join`, `/api/restaurants/:id/staff/*` |
| Assistant IA du gérant (lecture seule, via Groq) | ✅ Fonctionnelle (clé API requise) | `/api/restaurants/:id/ai`, `lib/ai/*` |
| Journal d'audit des actions | ✅ Écrit côté serveur, ❌ aucune interface de consultation | Table `AuditLog` |
| Modification de la fiche restaurant après création | ⚠️ Locale uniquement (pas d'endpoint `PATCH`) | `RestaurantProfileModal.tsx` |
| Espace client (accueil, recherche, plan en lecture seule, réservation, précommande, menu en livre) | ✅ Fonctionnelle (V1, voir §9) | `/api/discover/*`, `/api/reservations/*`, `/api/orders`, `app/mainpage/{explore,reservations,orders}` |
| Tableau de bord gérant (commandes en direct, réservations, activité) | ⚠️ Widgets avec données statiques | `restaurants/_components/*Widget.tsx` |
| Tableau de service du personnel (commandes) | ⚠️ Données statiques en mémoire | `staff/_lib/board.ts` |
| Favoris et notifications du client | ⏳ Pas d'implémentation (page Favoris vide) | `app/mainpage/favorites` |
| Connexion Google / Apple | ⏳ Boutons factices (`console.log`) | `SocialAuthButtons.tsx` |
| Mode hors ligne (PWA) | ✅ Service Worker Serwist | `app/sw.ts`, `next.config.ts` |

> Le schéma de base de données prévoit déjà les réservations, commandes, avis, notifications et médias, mais **aucune route API ne les exploite encore**.

---

## 2. Stack technique

### Langages et frameworks

| Domaine | Technologie | Version (package.json) | Rôle |
|---|---|---|---|
| Langage | **TypeScript** | `^5` (mode `strict`) | Tout le code (front et back) |
| Framework full-stack | **Next.js** (App Router) | `16.3.6` | Pages React + routes API (`route.ts`) |
| UI | **React** / React DOM | `19.2.8` | Composants, contextes, hooks |
| Styles | **Tailwind CSS** v4 via `@tailwindcss/postcss` | `^4` | Classes utilitaires, tokens de marque dans `globals.css` |
| Icônes | `lucide-react` | `^1.48.0` | Icônes de l'interface |
| Police | Plus Jakarta Sans (`next/font/google`) | — | Typographie |

> ⚠️ `AGENTS.md` (généré par `next dev`) avertit que cette version de Next.js comporte des changements incompatibles avec les versions antérieures : la documentation de référence se trouve dans `node_modules/next/dist/docs/`. Par exemple, les `params` des routes dynamiques sont des `Promise` (`await context.params`).

### Back-end et données

| Technologie | Version | Rôle |
|---|---|---|
| **PostgreSQL** | — | Base de données relationnelle |
| **Prisma 8** (`prisma`, `@prisma/orm-postgres`) | `8.0.0-rc.x` (pré-version) | ORM, schéma « contrat » (`prisma/contract.prisma`), migrations |
| `@prisma/client` | `^7.10.0` | Présent dans les dépendances, mais le code utilise uniquement le runtime `@prisma/orm-postgres` **(usage incertain)** |
| `temporal-polyfill` | `^1.0.5` | Prisma 8 décode les colonnes `timestamptz` en objets `Temporal` |
| **Zod** | `^4.6.5` | Validation de tous les corps de requête |
| **jose** | `^6.2.12` | Signature et vérification des JWT (HS256) |
| **bcryptjs** | `^3.0.3` | Hachage des mots de passe (12 tours) |

### PWA

| Technologie | Rôle |
|---|---|
| `@serwist/next` / `serwist` `^9.5.12` | Génère `public/sw.js` depuis `app/sw.ts` : pré-cache, page `/offline`, stratégies de cache |

### Services externes

| Service | Utilisation | Configuration |
|---|---|---|
| **Groq** (API compatible OpenAI) | Assistant IA du gérant, avec appel d'outils | `GROQ_API_KEY`, `GROQ_MODEL` (par défaut `openai/gpt-oss-120b`) |
| **Google Fonts** | Police Plus Jakarta Sans | Automatique via `next/font` |
| Stockage d'objets (S3 ou équivalent) | Prévu par le modèle `Media` (« Actual files live in object storage ») | ❌ Non implémenté |

### Pourquoi ces choix (déductions)

- **Next.js full-stack** : un seul dépôt et un seul déploiement pour l'interface et l'API. Le README d'origine (modèle `create-next-app`) cite Vercel comme cible de déploiement naturelle.
- **Prisma 8 avec contrat émis** : typage complet de la base (`prisma/contract.d.ts`) et requêtes du type `db.orm.public.User.where({...}).first()`. Le choix d'une version *release candidate* montre une volonté d'utiliser la nouvelle génération de Prisma, au prix d'une certaine instabilité. Des « skills » Prisma 8 pour agents IA sont d'ailleurs synchronisés par `postinstall`.
- **JWT access + refresh** avec `jose` : authentification sans état, sans dépendre d'un fournisseur externe. `jose` est compatible avec l'environnement Edge.
- **bcryptjs (pur JS)** plutôt que `bcrypt` natif : pas de module natif à compiler (le commentaire de `password.ts` le dit explicitement).
- **Groq** : inférence rapide et API compatible OpenAI, ce qui permet de changer de modèle via une simple variable d'environnement.
- **Serwist (PWA)** : application installable, avec une utilisation sur mobile et tablette en salle probablement visée.

---

## 3. Architecture du projet

> Le dépôt est imbriqué : `restivo-V1-main/restivo-V1-main/`. Le **vrai projet** est le dossier intérieur, celui qui contient `package.json`.

### Arborescence commentée

```text
restivo-V1-main/
├── app/                         # Next.js App Router : pages ET routes API
│   ├── layout.tsx               # Layout racine : police, <AuthProvider>, métadonnées
│   ├── page.tsx                 # "/" → affiche la page marketing (homepage)
│   ├── globals.css              # Tailwind v4 + couleurs de marque (clay, olive, ivory…)
│   ├── manifest.ts              # Manifeste PWA (⚠️ nom encore "PWA Serwist Lab")
│   ├── sw.ts                    # Source du Service Worker (stratégies de cache)
│   ├── offline/                 # Page affichée hors connexion
│   │
│   ├── api/                     # ── BACK-END : routes REST ──
│   │   ├── auth/                # signup, signin, signout, refresh, me, profile
│   │   ├── restaurants/         # liste/création + sous-ressources par restaurant
│   │   │   └── [restaurantId]/
│   │   │       ├── floors/      # CRUD étages, /layout (plan), /duplicate, /reorder
│   │   │       ├── menu/        # menu, categories/, items/
│   │   │       ├── promotions/  # CRUD promotions
│   │   │       ├── staff/       # équipe + requests/[requestId] (accepter/refuser)
│   │   │       └── ai/          # chat avec l'assistant IA
│   │   ├── discover/restaurants/ # côté client : liste, fiche, disponibilités, menu publié
│   │   ├── reservations/        # créer, lister, annuler, et /checkout (réservation + précommande)
│   │   ├── orders/              # précommandes du client (POST, GET)
│   │   ├── staff/join/          # côté employé : tableau d'adhésion + envoi de demande
│   │   └── time/                # renvoie l'heure serveur (utilitaire)
│   │
│   ├── homepage/                # Landing page marketing (Hero, Personas, Témoignages…)
│   ├── auth/                    # Pages signin / signup (assistant en 3 étapes)
│   │
│   └── mainpage/                # ── APPLICATION CONNECTÉE ──
│       ├── layout.tsx           # Shell persistant (sidebar + topnav selon la section)
│       ├── page.tsx             # Accueil client (restaurants publiés, via /api/discover)
│       ├── _components/         # Composants client : cartes resto, réservation, plan, sidebar…
│       │   └── book/            # Livre du menu : MenuBook, MenuBookDialog, pages, useMediaQuery
│       ├── profile/             # Profil utilisateur (connecté à l'API)
│       ├── explore/             # Recherche + fiche restaurant [restaurantId] (réservation, menu)
│       ├── reservations/        # Mes réservations, annulation, « Pre-order meals »
│       ├── orders/              # Mes précommandes
│       ├── favorites/           # Page vide « à venir »
│       │
│       ├── restaurants/         # Espace PROPRIÉTAIRE / GÉRANT
│       │   ├── page.tsx         # Tableau de bord (stats + widgets)
│       │   ├── _context/RestaurantManagerContext.tsx  # Restaurant courant, modales
│       │   ├── _components/     # Sidebar, TopNav, AddRestaurantModal, widgets…
│       │   ├── tables/          # Éditeur de plan de salle
│       │   │   ├── _lib/use-floors.ts            # Hook : appels API étages
│       │   │   └── _components/floor-plan/       # Canvas, toolbar, objets SVG, géométrie
│       │   ├── menu/            # Gestion du menu, catégories, promotions, aperçu
│       │   ├── staff/           # Équipe + demandes en attente
│       │   └── ai/              # Chat « AI Manager »
│       │
│       └── staff/               # Espace PERSONNEL
│           ├── page.tsx         # JoinBoard (si sans resto) ou StaffWorkspace
│           ├── _components/     # Tableau de service, réservations du jour…
│           └── _lib/            # Hooks + données statiques du tableau de service
│
├── contexts/
│   └── AuthContext.tsx          # État d'authentification côté client (token en mémoire)
│
├── lib/                         # ── LOGIQUE MÉTIER (organisée par domaine) ──
│   ├── db.ts                    # Singleton Prisma 8 (PostgreSQL)
│   ├── auth/                    # JWT, cookies, mots de passe, rôles, erreurs, validation
│   ├── restaurants/             # Accès, service, slug, sérialisation, erreurs
│   ├── floors/                  # Service étages/plan, conversion éditeur ⇄ BDD
│   ├── menu/                    # Service menu/catégories/plats/promotions, ordre (reorder.ts), aperçu (preview-view.ts)
│   ├── menu-book/               # Pagination pure du livre (paginate.ts, testée)
│   ├── discover/                # Recherche et fiche publiques des restaurants
│   ├── reservations/            # Créneaux, règles, réservation, checkout unique, annulation
│   ├── orders/                  # Précommandes, prix en entiers (pricing.ts), panier, menu commandable
│   ├── locks.ts                 # Verrous consultatifs PostgreSQL (par transaction)
│   ├── staff/                   # Demandes d'adhésion, roster (équipe)
│   └── ai/                      # Boucle d'outils LLM, prompt, outils, suggestions
│       └── tools/               # Registre sécurisé + outils get_restaurant/floors/menu/staff
│
├── prisma/
│   ├── contract.prisma          # ★ Schéma de la base (source de vérité)
│   ├── contract.json / .d.ts    # Contrat compilé (utilisé à l'exécution et pour les types)
│
├── migrations/
│   ├── app/20260924T2101_init/  # Migration initiale (création des tables)
│   ├── app/refs/db.json         # Hash du contrat attendu en base
│   └── snapshots/               # Instantanés de contrats successifs
│
├── public/                      # Images, icônes PWA, identité visuelle, sw.js généré
├── instrumentation.ts           # Charge le polyfill Temporal au démarrage du serveur Node
├── next.config.ts               # Serwist + paquets serveur non bundlés (pg, prisma, bcrypt)
├── prisma.config.ts             # Config Prisma (contrat + DATABASE_URL via dotenv)
├── eslint.config.mjs            # ESLint 9 + config Next (core-web-vitals, typescript)
├── tsconfig.json                # TS strict, alias "@/*" → racine
├── AGENTS.md / CLAUDE.md        # Consignes pour agents IA (générées par Next.js)
├── .agents/ .claude/ .cursor/ .devin/  # "Skills" Prisma 8 pour assistants de code
└── LICENSE                      # Licence propriétaire, strictement confidentielle
```

### Organisation du code en couches

Le back-end suit une architecture en couches nette, appliquée de façon homogène à chaque domaine :

```text
┌───────────────────────────────────────────────────────────────┐
│ UI (React, "use client")   app/mainpage/**/page.tsx           │
│   └─ hooks / contextes     use-floors.ts, AuthContext…        │
├───────────────────────────────────────────────────────────────┤
│ Client API                 lib/<domaine>/client.ts            │
│   fetch() + Bearer token → lève ApiError(code, message)       │
├───────────────────────────────────────────────────────────────┤
│ Route handler              app/api/**/route.ts                │
│   1. contrôle d'accès  (lib/<domaine>/access.ts)              │
│   2. validation Zod    (lib/<domaine>/validation.ts)          │
│   3. appel du service                                         │
│   4. erreurs → JSON typé (lib/<domaine>/errors.ts)            │
├───────────────────────────────────────────────────────────────┤
│ Service métier             lib/<domaine>/service.ts           │
│   règles métier, transactions, AuditLog                       │
├───────────────────────────────────────────────────────────────┤
│ Accès données              lib/db.ts → Prisma 8 → PostgreSQL  │
└───────────────────────────────────────────────────────────────┘
```

Conventions observées :

- **Routes très fines** : chaque `route.ts` fait 10 à 20 lignes et délègue tout au service.
- **Erreurs typées** : `AuthError` et `RestaurantError` portent un `code` stable (`FORBIDDEN`, `SLUG_TAKEN`, `CONFLICT`…) et un statut HTTP. Le client reçoit toujours `{ ok: false, code, message }`, et les erreurs internes ne sont jamais exposées.
- **Sérialisation explicite** : les lignes de la base sont converties en types « publics » (`PublicRestaurant`, `PublicFloor`, `PublicMenu`) avant d'être renvoyées.
- **Fichiers `_components`, `_lib`, `_context`, `_data`** : le préfixe `_` exclut ces dossiers du routage Next.js et garde chaque composant près de la page qui l'utilise.
- Toutes les routes API déclarent `export const dynamic = "force-dynamic"` (aucun cache côté serveur).

### Schéma des interactions

```mermaid
flowchart LR
    subgraph Navigateur
        UI[Pages React<br/>app/mainpage]
        AC[AuthContext<br/>access token en mémoire]
        SW[Service Worker<br/>Serwist]
    end

    subgraph "Serveur Next.js (Node)"
        API[Routes API<br/>app/api/**]
        ACC[Contrôle d'accès<br/>lib/*/access.ts]
        SVC[Services métier<br/>lib/*/service.ts]
        AI[Boucle IA<br/>lib/ai/groq.ts + loop.ts]
        REG[Registre d'outils<br/>lib/ai/tools]
    end

    DB[(PostgreSQL)]
    GROQ[[API Groq<br/>LLM]]

    UI -- "fetch + Bearer token" --> API
    AC -- "cookie httpOnly restivo_rt" --> API
    UI -.cache.- SW
    API --> ACC --> SVC --> DB
    API --> AI
    AI <-- "chat/completions + tools" --> GROQ
    AI --> REG --> SVC
```

---

## 4. Démarche et fonctionnement

### 4.1 Parcours de bout en bout : sauvegarder un plan de salle

Exemple représentatif : le gérant place des tables dans l'éditeur, puis clique sur « Enregistrer / Publier ».

```mermaid
sequenceDiagram
    actor G as Gérant
    participant E as FloorEditor<br/>(use-floor-editor.ts)
    participant H as use-floors.ts
    participant C as lib/floors/client.ts
    participant R as PUT /api/restaurants/:id/floors/:floorId/layout
    participant A as requireManagedRestaurant
    participant V as saveLayoutSchema (Zod)
    participant S as floors/service.saveLayout
    participant DB as PostgreSQL

    G->>E: Glisse / redimensionne des objets (en mètres)
    G->>H: Enregistrer (publish = true)
    H->>C: apiSaveLayout(token, restaurantId, floorId, objects, publish)
    C->>R: fetch PUT + Authorization: Bearer <access token>
    R->>A: vérifie le JWT, le statut du compte, le rôle OWNER/MANAGER sur CE restaurant
    R->>V: valide ≤ 400 objets, coordonnées 0–80 m, types connus
    R->>S: saveLayout(userId, restaurantId, floorId, body)
    S->>DB: TRANSACTION
    Note over S,DB: 1. refuse de supprimer une table ayant des réservations<br/>2. supprime puis recrée les FloorObject<br/>3. met à jour / crée / supprime les Table<br/>4. Floor.isActive = true si publish
    S->>DB: AuditLog (STATUS_CHANGE ou UPDATE)
    S-->>R: PublicFloor (objets, tableCount, seatCount)
    R-->>C: { ok: true, floor }
    C-->>H: met à jour l'état React
```

Points intéressants :

- L'éditeur travaille en **mètres** (`floor-object.ts`). La conversion vers le stockage est assurée par `lib/floors/map.ts`, qui gère aussi d'anciennes valeurs en pixels (`LEGACY_PIXEL_SIZE`).
- Les objets « table » (`ROUND_TABLE`, `BOOTH`, `BAR_TABLE`…) sont stockés **deux fois** : dans `FloorObject` (rendu visuel, avec un champ `data` JSON) et dans `Table` (entité métier référencée par les réservations).
- Les violations de contrainte PostgreSQL (`23505` unicité, `23503` clé étrangère) sont traduites en messages lisibles.

### 4.2 Principaux workflows métier

#### a) Inscription et orientation

1. L'utilisateur suit un assistant en 3 étapes (`/auth/signup`) et choisit son profil : `owner`, `staff` ou `customer`.
2. `POST /api/auth/signup` crée `User` et `Profile` dans **une transaction**. Le rôle choisi est stocké dans `User.managementRole`.
3. Il est redirigé vers `/mainpage`. La sidebar affiche les entrées « Mes restaurants » ou « Espace staff » selon `canManageRestaurants` et `isStaff`.

#### b) Création d'un restaurant (propriétaire)

`POST /api/restaurants` → `createRestaurantForOwner`, en une seule transaction :

1. Génère un **slug unique** à partir du nom (12 tentatives : `nom`, `nom-2`… puis un suffixe aléatoire).
2. Crée le `Restaurant` au statut `DRAFT`.
3. Crée une `RestaurantMembership` `OWNER` / `ACTIVE`.
4. Crée les **7 lignes `BusinessHours`** (une par jour).
5. Crée le **premier étage** (`Floor`).
6. Écrit un `AuditLog`.

#### c) Recrutement du personnel

```mermaid
stateDiagram-v2
    [*] --> PENDING: Employé → POST /api/staff/join
    PENDING --> ACCEPTED: Gérant → ACCEPT
    PENDING --> DECLINED: Gérant → DECLINE
    ACCEPTED --> [*]: RestaurantMembership STAFF / ACTIVE créée
    DECLINED --> [*]
```

- L'employé voit la liste des restaurants ouverts (`ACTIVE` ou `DRAFT`) et envoie une demande, accompagnée d'un message facultatif de 280 caractères maximum.
- Les doublons sont refusés : déjà membre, ou demande déjà en attente.
- Le gérant traite la demande dans `/mainpage/restaurants/staff`. Le traitement relit le statut **dans la transaction** (`assertStillPending`), ce qui évite qu'une demande soit traitée deux fois.
- Une fois accepté, l'employé voit son `StaffWorkspace` au lieu du `JoinBoard`.

#### d) Menu et promotions

- **Un menu par restaurant** : le code prend `menus[0]`, et la création d'un second menu renvoie `CONFLICT`.
- Arborescence : `Menu → MenuCategory → MenuItem`. Chaque mutation renvoie l'**arbre complet** du menu (`getMenuTree`), ce qui simplifie la synchronisation côté client.
- Une promotion est de type `PERCENTAGE` (≤ 100) ou `FIXED_AMOUNT`, a une période de validité, et est liée à des plats via `PromotionItem`. Elle est dite « live » si elle est active et que la date du jour tombe dans sa période.

#### e) Assistant IA du gérant

```mermaid
flowchart TD
    Q[Question du gérant<br/>≤ 12 derniers messages] --> V[Validation Zod<br/>dernier message = user]
    V --> P[Prompt système<br/>« appelle un outil avant d'affirmer un fait »]
    P --> L{Boucle d'outils<br/>max 4 étapes / 6 appels}
    L -- tool_call --> R[Registre sécurisé]
    R --> C1{Arguments contiennent<br/>restaurantId / userId ?}
    C1 -- oui --> X[Refus]
    C1 -- non --> C2{L'utilisateur gère<br/>ce restaurant ?}
    C2 -- non --> X
    C2 -- oui --> T[get_restaurant · get_floors<br/>get_menu · get_staff]
    T --> L
    L -- réponse texte --> A[Réponse + sources<br/>+ suggestions de questions]
```

- L'IA est en **lecture seule** et limitée à 4 outils (liste blanche dans `lib/ai/tools/index.ts`).
- L'identifiant du restaurant vient **toujours de la session**, jamais du modèle : c'est une protection contre l'injection de prompt. Les tests de `registry.test.ts` vérifient ce point.
- Chaque réponse est accompagnée de **sources** (« 24 active menu items ») et de **suggestions de questions** générées de façon déterministe (`follow-ups.ts`), sans passer par le LLM.
- Les balises `<think>…</think>` éventuelles du modèle sont retirées de la réponse.
- Le fil de discussion vit uniquement en mémoire : il est perdu au rechargement de la page.

### 4.3 Authentification, rôles et sécurité

#### Mécanisme des jetons

| Élément | Durée | Stockage | Usage |
|---|---|---|---|
| **Access token** (JWT HS256, `type: "access"`) | 15 min | **Mémoire JS** (`useRef` dans `AuthContext`) | En-tête `Authorization: Bearer …` sur chaque appel API |
| **Refresh token** (JWT HS256, `type: "refresh"`) | 7 jours | Cookie **httpOnly** `restivo_rt`, `SameSite=Lax`, `Secure` en production | `POST /api/auth/refresh`, avec **rotation** à chaque appel |
| **Indicateur de session** | 7 jours | Cookie lisible `restivo_sid=1` | Évite un appel `/refresh` (et une erreur 401) pour les visiteurs anonymes |

```mermaid
sequenceDiagram
    participant B as Navigateur
    participant API as /api/auth
    B->>API: POST /signin {email, password}
    API-->>B: { accessToken, user } + Set-Cookie restivo_rt (httpOnly) + restivo_sid
    Note over B: Rechargement de la page → token perdu (mémoire)
    B->>API: POST /refresh (cookie envoyé automatiquement)
    API-->>B: nouveau accessToken + nouveau refresh token (rotation)
    B->>API: GET /me (Bearer)
    API-->>B: profil frais lu en base
```

#### Rôles et autorisations

Les droits sont **calculés à chaque requête** à partir de la base (`resolveRestaurantAccess`) et ne sont pas lus dans le JWT :

- `canManageRestaurants` : `managementRole` vaut OWNER ou MANAGER, **ou** l'utilisateur a une adhésion ACTIVE avec l'un de ces rôles.
- `isStaff` : rôle STAFF (compte ou adhésion) **et** pas déjà gérant.
- Sur une ressource précise, `requireManagedRestaurant` vérifie que l'utilisateur est le **propriétaire** (`Restaurant.ownerId`) ou un **OWNER ou MANAGER actif** de *ce* restaurant.

#### Bonnes pratiques de sécurité observées

- Mots de passe hachés avec **bcrypt (12 tours)**, longueur de 8 à 72 caractères (72 étant la limite de bcrypt).
- **Message d'erreur identique** pour un email inconnu et un mauvais mot de passe, afin d'empêcher l'énumération des comptes.
- Les comptes `SUSPENDED` ou `DELETED` sont bloqués à la connexion, à chaque refresh et à chaque appel protégé.
- Le claim `type` empêche d'utiliser un refresh token comme access token, et inversement.
- Toutes les entrées sont validées par **Zod**, et les erreurs internes sont journalisées côté serveur sans être exposées.
- Un **journal d'audit** (`AuditLog`) enregistre les créations, modifications, suppressions, acceptations et refus.

#### Limites de sécurité à connaître

- Les pages front ne sont protégées que **côté client** (`useEffect` + `router.replace`). Il n'y a pas de `middleware`/`proxy` Next.js, et le garde serveur `requireRestaurantManager()` de `lib/auth/access.ts` n'est appelé nulle part. Les **données** restent protégées par l'API, mais le squelette des pages est accessible.
- Pas de liste de révocation des refresh tokens : la déconnexion supprime le cookie, mais un jeton volé reste valide jusqu'à son expiration.
- Aucune limitation de débit (*rate limiting*) sur `/signin` ni sur `/ai`.
- Pas de vérification d'email : le champ `emailVerifiedAt` existe mais n'est jamais renseigné.
- Les routes de mutation reposent sur l'en-tête `Bearer`, ce qui limite naturellement le CSRF. En revanche, `/refresh` repose uniquement sur le cookie `SameSite=Lax`.

---

## 5. Modèle de données

Source : `prisma/contract.prisma`. Toutes les clés primaires sont des **ULID** (`@default(ulid())`), sauf pour les tables `Table` et `FloorObject` dont les identifiants sont fournis par l'éditeur. Les dates sont en `timestamptz`, en UTC. Les montants et coordonnées sont en `Decimal`.

### Entités principales

| Entité | Rôle | Champs clés |
|---|---|---|
| `User` | Compte de connexion | `email` (unique), `passwordHash`, `status`, `managementRole` |
| `Profile` | Informations personnelles (1-1 avec User) | `firstName`, `lastName`, `displayName`, `phone`, `bio`, `avatarUrl` |
| `Restaurant` | Établissement | `ownerId`, `slug` (unique), coordonnées, `currency`, `timezone`, `status` |
| `RestaurantMembership` | Lien utilisateur ↔ restaurant avec un rôle | `role` (OWNER/MANAGER/STAFF), `status`, unique `(userId, restaurantId)` |
| `RestaurantMembershipRequest` | Demande d'adhésion d'un employé | `status`, `message`, `reviewedById`, `reviewedAt` |
| `BusinessHours` | Horaires (7 lignes par restaurant) | `dayOfWeek` (0 = dimanche), `isClosed`, `openTime`, `closeTime` |
| `Floor` | Étage ou salle | `name`, `level`, `width`, `height`, `sortOrder`, `isActive` |
| `Table` | Table réservable | `name` (unique par étage), `type`, `capacity`, position et rotation |
| `FloorObject` | Élément visuel du plan (mur, porte, bar…) | `type`, géométrie, `zIndex`, `data` (JSON) |
| `Menu` → `MenuCategory` → `MenuItem` | Carte | `price`, `isAvailable`, `isFeatured`, `sortOrder` |
| `Promotion` + `PromotionItem` | Remises et plats concernés (N-N) | `type`, `value`, `startsAt`, `endsAt` |
| `Reservation` | Réservation d'une table | `reservationCode` (unique), `startsAt`/`endsAt`, `guestCount`, `status` |
| `Order` + `OrderItem` | Commande et lignes | `subtotal`, `discount`, `total` ; *snapshots* du nom et du prix |
| `Review` | Avis (1 par réservation) | `rating`, `comment`, `status` |
| `Notification` | Notifications utilisateur | `type`, `readAt`, `expiresAt`, `data` (JSON) |
| `Media` | Métadonnées de fichiers (stockés ailleurs) | `url`, `storageKey`, `mimeType` |
| `AuditLog` | Historique des actions | `action`, `entityType`, `entityId`, `metadata` (JSON) |

Les tables en *italique* dans le diagramme ci-dessous ne sont **pas encore utilisées** par l'API : `Reservation`, `Order`, `OrderItem`, `Review`, `Notification`, `Media`.

### Diagramme entité-relation

```mermaid
erDiagram
    User ||--o| Profile : "a"
    User ||--o{ Restaurant : "possède (owner)"
    User ||--o{ RestaurantMembership : "est membre"
    User ||--o{ RestaurantMembershipRequest : "demande"
    User ||--o{ Reservation : "réserve (client)"
    User ||--o{ Order : "commande (client)"
    User ||--o{ Review : "rédige"
    User ||--o{ Notification : "reçoit"
    User ||--o{ AuditLog : "agit"

    Restaurant ||--o{ RestaurantMembership : ""
    Restaurant ||--o{ RestaurantMembershipRequest : ""
    Restaurant ||--o{ BusinessHours : "7 jours"
    Restaurant ||--o{ Floor : ""
    Restaurant ||--o{ Menu : ""
    Restaurant ||--o{ Promotion : ""
    Restaurant ||--o{ Reservation : ""
    Restaurant ||--o{ Order : ""
    Restaurant ||--o{ Review : ""
    Restaurant ||--o{ Media : ""

    Floor ||--o{ Table : ""
    Floor ||--o{ FloorObject : ""

    Menu ||--o{ MenuCategory : ""
    MenuCategory ||--o{ MenuItem : ""
    Promotion ||--o{ PromotionItem : ""
    MenuItem ||--o{ PromotionItem : ""

    Table ||--o{ Reservation : ""
    Reservation ||--o{ Order : ""
    Reservation ||--o| Review : "1 avis max"
    Order ||--o{ OrderItem : ""
    MenuItem ||--o{ OrderItem : "snapshot"
```

### Règles d'intégrité notables

- **Cascade** : supprimer un restaurant supprime ses étages, menus, adhésions, etc.
- **Restrict** : impossible de supprimer un `User` qui possède un restaurant ou qui a des réservations ou commandes, ni une `Table` qui a des réservations. Le service des étages vérifie aussi ce dernier point en amont.
- **SetNull** : un `OrderItem` garde son nom et son prix (*snapshots*) même si le plat est supprimé.
- Les énumérations Prisma sont matérialisées en PostgreSQL par des **contraintes `CHECK`** sur des colonnes `text` (voir `migration.ts`).

### Migrations

- Il n'existe qu'une migration, `migrations/app/20260924T2101_init/`, qui produit le contrat `08e8c9…`.
- Or `migrations/app/refs/db.json` et `prisma/contract.json` pointent vers un contrat **plus récent** (`6f4f5f…`), dont l'instantané existe dans `migrations/snapshots/`. **Aucune migration** ne fait le lien entre les deux : la base a peut-être été mise à jour directement, sans migration versionnée **(incertain)**. À vérifier avant tout déploiement.

---

## 6. Installation et lancement

### Prérequis

| Outil | Version | Remarque |
|---|---|---|
| **Node.js** | ≥ 22.6 recommandé | Nécessaire pour `--experimental-strip-types` (tests). Le commentaire de `lib/db.ts` mentionne Node 24 |
| **npm** | fourni avec Node | Un `package-lock.json` est présent |
| **PostgreSQL** | non précisé | Base accessible via une URL de connexion |
| Clé **Groq** | facultative | Seulement pour l'assistant IA |

### Variables d'environnement

Les fichiers `.env*` sont ignorés par Git et **aucun `.env.example` n'est fourni**. Voici les variables lues par le code :

| Variable | Obligatoire | Utilisée par | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `lib/db.ts`, `prisma.config.ts` | URL PostgreSQL, ex. `postgresql://user:pass@localhost:5432/restivo` |
| `JWT_SECRET` | ✅ | `lib/auth/jwt.ts` | Secret HMAC des JWT ; le serveur lève une erreur s'il est absent |
| `GROQ_API_KEY` | ⚠️ pour l'IA | `lib/ai/groq.ts` | Clé API Groq (la variante `Groq_API_Key` est aussi acceptée) |
| `GROQ_MODEL` | ❌ | `lib/ai/groq.ts` | Modèle LLM, `openai/gpt-oss-120b` par défaut |
| `NODE_ENV` | auto | cookies, Serwist, db | `production` active les cookies `Secure` et le Service Worker |

Exemple de fichier `.env` :

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/restivo"
JWT_SECRET="remplacer-par-une-longue-chaine-aleatoire"
GROQ_API_KEY="gsk_..."
# GROQ_MODEL="openai/gpt-oss-120b"
```

### Installation

```bash
cd restivo-V1-main          # le dossier qui contient package.json
npm install                 # lance aussi "prisma skills sync" (postinstall, échec toléré)
```

### Initialiser la base de données

> Le projet ne définit **aucun script npm** pour les migrations. Les commandes exactes de Prisma 8 (CLI en *release candidate*) sont à confirmer dans la documentation embarquée (`.claude/skills/prisma-8/references/migrations.md`) **(incertain)**.

Démarche générale :

1. Créer une base PostgreSQL vide.
2. Appliquer la ou les migrations de `migrations/app/` avec la CLI `prisma`. Compte tenu de l'écart de contrat signalé plus haut, il faudra peut-être aussi aligner la base sur le contrat actuel.
3. Aucun script de *seed* n'est fourni : les premières données se créent via l'interface (inscription puis création d'un restaurant).

### Lancement en développement

```bash
npm run dev        # next dev --webpack → http://localhost:3000
```

- Le Service Worker est **désactivé** en développement (`disable: NODE_ENV === "development"`).
- `next dev` régénère le bloc de consignes dans `AGENTS.md`.

### Build et lancement en production

```bash
npm run build      # next build --webpack (génère aussi public/sw.js)
npm run start      # next start
```

- Le flag `--webpack` est imposé : le plugin Serwist s'appuie sur webpack.
- `pg`, `@prisma/orm-postgres`, `@prisma/orm-family-sql` et `bcryptjs` sont exclus du bundle (`serverExternalPackages`). Il faut donc un **runtime Node.js** et non Edge.
- Aucun `Dockerfile` ni fichier CI/CD n'est présent. Le README mentionne Vercel comme option de déploiement.

### Scripts npm disponibles

| Script | Commande | Rôle |
|---|---|---|
| `dev` | `next dev --webpack` | Serveur de développement |
| `build` | `next build --webpack` | Build de production |
| `start` | `next start` | Serveur de production |
| `lint` | `eslint` | Analyse statique |
| `test` | `node --experimental-strip-types --test …` | Tests unitaires |
| `postinstall` | `prisma skills sync \|\| exit 0` | Synchronise les « skills » Prisma pour agents IA |

---

## 7. Tests et qualité

### Tests automatisés

```bash
npm test
```

- **Outil** : le *test runner natif* de Node.js (`node:test` + `node:assert/strict`), sans Jest ni Vitest.
- Les fichiers TypeScript sont exécutés directement grâce à `--experimental-strip-types` (Node ≥ 22.6). C'est pourquoi les imports des tests portent l'extension `.ts`.
- Les fichiers `*.test.ts` sont exclus de la compilation TypeScript (`tsconfig.json` → `exclude`).

| Fichier | Ce qui est testé |
|---|---|
| `lib/ai/tools/registry.test.ts` | **Sécurité de l'IA** : un propriétaire ne peut pas lire un autre restaurant ; un argument d'outil ne peut pas changer de restaurant ; un outil autorisé ne reçoit que le restaurant autorisé ; format des sources |
| `lib/ai/follow-ups.test.ts` | Génération des questions de suivi : types `ask`/`pick`/`write`, cas sans prix, pas de suggestion hors des outils exécutés, cas vides |
| `lib/auth/token-expiry.test.ts` | Lecture de l'expiration du JWT et calcul du moment de rafraîchissement silencieux |
| `lib/restaurants/publish.test.ts` | Règle de publication (étage actif + au moins une table) et transitions de statut |
| `lib/discover/search.test.ts` | Recherche par nom ou ville, insensible à la casse et aux accents |
| `lib/reservations/rules.test.ts` | Chevauchement, capacité, horaires, fuseau horaire, délai minimum et maximum, annulation, accès |
| `lib/orders/pricing.test.ts` | Tarification en entiers (TND = 3 décimales), promotions, totaux |
| `lib/reservations/service.integration.test.ts` | Réservations et précommandes de bout en bout (concurrence, refus, cascade). **Sautée** sans `DATABASE_URL` ou sans serveur ; `npm run test:integration` la lance contre le serveur de dev et nettoie ses données |

> La couverture reste **partielle** : les règles pures (publication, réservation, tarification, recherche) et le parcours réservation/commande sont testés, mais les composants, l'authentification complète et les autres services métier ne le sont pas. Il n'y a pas de tests de bout en bout dans un navigateur.

### Qualité du code

| Outil | Configuration |
|---|---|
| **ESLint 9** | `eslint.config.mjs` : `eslint-config-next/core-web-vitals` et `eslint-config-next/typescript` |
| **TypeScript strict** | `strict: true`, typage de la base généré depuis le contrat Prisma |
| **Zod** | Validation runtime de toutes les entrées d'API et des arguments des outils IA |

Il n'y a pas de Prettier configuré, pas de hook Git (Husky) et pas de pipeline CI dans le dépôt.

---

## 8. Points d'amélioration

### Fonctionnalités incomplètes

1. **Réservations et commandes côté gérant et personnel** : le client peut réserver et précommander (voir §9), mais les widgets du tableau de bord gérant et le tableau de service du personnel affichent encore des **données statiques** (voir §10). Les avis (`Review`) n'ont pas d'implémentation.
2. **Espace client** : dynamique depuis la V1 (voir §9). Restent factices les favoris et les notifications. Le nom « Ahmed » subsiste dans des maquettes côté gérant et personnel (`RestaurantTopNav`, `ReservationsWidget`, `FloorPlanView`, `staff/_lib/board.ts`).
3. **Modification d'un restaurant** : il n'existe pas de `PATCH /api/restaurants/:id`. Les modifications faites dans `RestaurantProfileModal` restent dans l'état React et sont perdues au rechargement. Le passage de `DRAFT` à `ACTIVE` se fait désormais par `PATCH /api/restaurants/:id/status` (bouton « Publish restaurant »).
4. **Notifications, médias et avis** : tables présentes, aucune implémentation. L'upload d'images se limite à des URL ou à des photos prédéfinies.
5. **Rôle MANAGER** : prévu dans le modèle, mais aucun parcours ne permet de nommer un gérant. Seuls OWNER (à la création) et STAFF (par adhésion) sont attribués.
6. **OAuth Google / Apple** : boutons factices.
7. **Historique du chat IA** : non persisté.
8. **Menu côté gérant** : réordonnancement par boutons ↑ ↓ uniquement (pas de glisser-déposer), pas d'étiquettes (végétarien, épicé…), images de plats par URL. Le réglage « Published » du panneau *Menu settings* publie sans l'avertissement de menu vide de l'en-tête, et le formulaire de promotion se vide même quand le serveur refuse la saisie.

### Dette technique

- **Restaurant de démonstration** (`FALLBACK_RESTAURANTS`, id `"maison-olive"`) : il s'affiche quand un gérant n'a aucun restaurant ou en cas d'erreur API. Les appels API qui suivent ciblent alors un identifiant inexistant (404), et l'écran « Create a restaurant first » de la page IA ne peut pas apparaître.
- **Requêtes N+1** : `listManagedRestaurants`, `loadRoster` (un `Profile` par personne), `getMenuTree` (une requête par catégorie) et `replaceLayout` (suppressions et créations une par une, jusqu'à 400 objets) feront beaucoup d'allers-retours avec la base quand le volume augmentera. Des requêtes groupées (`IN`, `createMany`) seraient préférables.
- **Opérations non atomiques** : `reorderFloor` (deux `update` hors transaction, alors que le réordonnancement des catégories et plats du menu est, lui, transactionnel), `createFloor` (calcul de `level`/`sortOrder` par comptage, sujet aux conditions de course) et `writeAudit` (hors de la transaction métier dans `floors` et `menu`).
- **Couplage `lib` → `app`** : `lib/floors/*` et `lib/ai/tools/floors` importent des types et constantes depuis `app/mainpage/restaurants/tables/_components/floor-plan/`. Le domaine dépend donc de l'UI : `floor-object.ts` et `constants.ts` seraient mieux placés dans `lib/floors/`.
- **Duplication** : `handleResponse` est recopié dans chaque `client.ts`, et `parse*Body` dans plusieurs fichiers de validation. Un petit utilitaire `lib/http` les factoriserait.
- **Migrations désynchronisées** : le contrat courant (`6f4f5f…`) n'a pas de migration correspondante (voir §5).
- **Dépendances en pré-version** : Prisma 8 RC, plus `@prisma/client` v7 qui semble inutilisé.
- **Manifeste PWA non personnalisé** : `name: "PWA Serwist Lab"`, couleurs violettes sans rapport avec la charte Restivo.
- **README générique** (modèle `create-next-app`), pas de `.env.example`, pas de scripts pour les migrations ou le seed.
- **Langue mixte** : interface en anglais, page hors ligne en français. Il n'y a pas de système d'i18n.
- Route utilitaire `/api/time` sans usage apparent dans le code.

### Sécurité et robustesse

- Ajouter une **protection serveur des pages** (`middleware`/`proxy` Next.js, ou `requireRestaurantManager()` dans des layouts serveur).
- Mettre en place une **révocation des refresh tokens** (table de sessions ou liste noire) et détecter leur réutilisation.
- Ajouter du **rate limiting** sur `/api/auth/signin`, `/signup` et `/api/restaurants/:id/ai`, ce dernier ayant un coût direct en appels LLM.
- Implémenter la **vérification d'email** et la réinitialisation du mot de passe.

### Tests et outillage

- Tester l'authentification (rotation, comptes suspendus), les services (`staff/roster`, `floors/service`, `menu/service`) et la validation Zod.
- Ajouter des tests d'intégration sur une base PostgreSQL éphémère et des tests de bout en bout (Playwright) pour les parcours clés : inscription, création de restaurant, édition du plan.
- Mettre en place une CI (lint, `tsc --noEmit`, tests, build) et un `Dockerfile` ou une configuration de déploiement.

### Évolutions possibles

- Prise de réservation par le client sur le plan de salle réel, en s'appuyant sur les `Table` et `capacity` déjà en place.
- Prise de commande en salle par le personnel, avec un suivi en temps réel (WebSocket ou SSE) pour remplacer les données statiques du tableau de service.
- Outils IA supplémentaires (réservations, ventes) une fois ces données disponibles. Le registre est conçu pour cela : il suffit d'ajouter un outil à la liste blanche.
- Vue 3D du plan de salle : le champ `FloorObject.data` est annoté « *Flexible data for future 3D rendering* ».
- Tableau de bord de l'`AuditLog` pour les propriétaires.

---

## 9. Espace client dynamique (V1)

Le parcours client est réel, de bout en bout : le gérant crée son restaurant et son plan 2D, le publie, puis le client le trouve, choisit une table libre, réserve et précommande.

### Parcours et pages

| Étape | Page | API |
|---|---|---|
| Publier le restaurant (gérant) | `/mainpage/restaurants` et « Tables & floors » (bouton *Publish restaurant*) | `PATCH /api/restaurants/:id/status` |
| Lister les restaurants publiés | `/mainpage`, `/mainpage/explore` (recherche par nom ou ville) | `GET /api/discover/restaurants?q=` |
| Voir un restaurant, son plan en lecture seule, ses horaires | `/mainpage/explore/[restaurantId]` | `GET /api/discover/restaurants/:id` |
| Voir les tables libres d'un créneau | idem (formulaire date, heure, invités) | `GET /api/discover/restaurants/:id/availability?date=&time=&guests=` |
| Réserver (avec ou sans plats), annuler | idem, puis `/mainpage/reservations` | `POST /api/reservations/checkout` (réservation + précommande), `POST /api/reservations`, `GET /api/reservations`, `POST /api/reservations/:id/cancel` |
| Voir le menu et précommander | idem (section *Menu*), puis `/mainpage/orders` | `GET /api/discover/restaurants/:id/menu`, `POST` et `GET /api/orders` |

Toutes ces routes exigent un compte `ACTIVE` (Bearer) : l'identité vient toujours du JWT. Les pages client redirigent vers `/auth/signin` si la session est absente (`useRequireSignIn`).

### Le menu en livre et la confirmation unique

- **Livre** : le menu s'affiche dans `MenuBook` (`app/mainpage/_components/book/`) : couverture, sommaire, un chapitre par catégorie, puis les plats. Deux pages côte à côte sur grand écran, une seule sur mobile ; le tour de page est en CSS 3D, sans bibliothèque, et instantané si le visiteur préfère réduire les animations. La pagination est un module pur testé (`lib/menu-book/paginate.ts`), qui mémorise la position de lecture par ancre pour survivre à un redimensionnement. `MenuBookDialog` l'affiche en plein écran, avec « View as list » (`MenuList`) et fermeture par Échap. Trois modes : `browse` (lecture), `order` (boutons − / +), `manager-preview` (lecture, vue du gérant).
- **Entrées** : « Open the menu » (consultation sans réservation) sur la fiche restaurant ; « Explore the menu » dans `BookingPanel` après le choix d'une table (mode `order`) ; « Pre-order meals » dans `/mainpage/reservations` (lien `?preorder=<reservationId>`, réservation à venir du client) ; « Preview menu » côté gérant (`lib/menu/preview-view.ts` convertit le menu du gérant, brouillon compris, avec les promotions en cours). L'ancien panneau de précommande `MenuOrderPanel` n'existe plus.
- **Confirmation unique** : le parcours se termine par une seule étape de revue, puis un seul appel `POST /api/reservations/checkout` (`lib/reservations/checkout.ts`). La réservation et la précommande sont créées dans la même transaction, avec le même verrou de table : si un plat est refusé ou si le créneau est pris, rien n'est enregistré. Sans plat choisi, l'appel ne crée que la réservation. `POST /api/reservations` seul reste disponible.
- **Côté gérant** : les prix des plats sont des chaînes décimales (`"18.500"`) validées selon les décimales de la devise du restaurant (`normalizePrice`, `lib/orders/pricing.ts`) ; l'API accepte encore un nombre. Catégories et plats se réordonnent par `POST …/categories/:id/move` et `POST …/items/:id/move` (`{direction: "up"|"down"}`), en transaction avec journal d'audit. L'interrupteur Published/Draft de l'en-tête publie ou dépublie le menu ; publier sans plat disponible demande une confirmation dans la page.

### Règles métier

- **Visibilité** : un restaurant est visible s'il est `ACTIVE` et possède au moins un étage actif contenant au moins une table active (même règle que la publication, `lib/restaurants/publish.ts`).
- **Créneau** : 90 minutes (`lib/reservations/constants.ts`). Il doit tenir entièrement dans les horaires du jour, au moins 30 minutes avant le début et au plus 60 jours à l'avance. Date et heure sont celles du fuseau du restaurant, stockées en UTC.
- **Statut** : une réservation est `CONFIRMED` dès sa création. Tout compte `ACTIVE` peut réserver. Le client ne peut annuler que `PENDING` ou `CONFIRMED`, et seulement avant le début du créneau.
- **Capacité** : le nombre d'invités ne peut pas dépasser les places de la table.
- **Double réservation** : chaque réservation d'une table s'exécute dans une transaction qui prend un verrou consultatif PostgreSQL (`pg_advisory_xact_lock`, `lib/locks.ts`), puis relit les réservations de la table. Sur deux demandes identiques et simultanées, une seule passe (409 `SLOT_TAKEN`). `tx` n'expose pas `raw`, mais un plan `db.raw.sql` s'exécute avec `tx.execute`. Aucune migration n'a été nécessaire.
- **Précommande** : liée à une réservation du client, active et à venir. Plusieurs précommandes par réservation sont possibles. Seuls les plats du menu publié, de catégories actives et disponibles sont acceptés.
- **Prix** : recalculés côté serveur, en entiers selon les décimales de la devise (TND = 3), jamais en flottants. Tout prix envoyé par le client est ignoré. Promotion par unité : `PERCENTAGE` = pourcentage du prix, `FIXED_AMOUNT` = montant retiré par unité (plafonné au prix), une seule promotion par plat (la meilleure), sans cumul. `OrderItem.priceSnapshot` est le prix avant promotion et `Order.discount` la remise totale.
- **Annulation en cascade** : annuler une réservation passe en `CANCELLED` ses précommandes `PENDING` ou `CONFIRMED`, dans la même transaction (même verrou que la création de commande).

### Limites connues

- **Horaires de nuit non gérés** : un jour dont la fermeture est antérieure ou égale à l'ouverture (par exemple 12:00 à 03:00) n'est jamais réservable, car un créneau doit commencer et finir le même jour local. Il faut saisir par exemple 12:00 à 23:59.
- **Devise par défaut incohérente** : le schéma Prisma met `EUR` par défaut à `Restaurant.currency`, alors que la validation de création met `TND`. Le code suit la devise de chaque restaurant, mais la valeur par défaut reste à trancher.
- **Recherche en mémoire** : le filtre nom/ville s'applique après lecture des restaurants `ACTIVE`, avec quelques requêtes par restaurant. À revoir avec beaucoup de restaurants.
- **Menu** : un restaurant sans menu publié (`Menu.isPublished`, faux par défaut) s'affiche sans carte.
- Pas de cuisine, note, distance ni fourchette de prix côté client (aucune colonne en base), pas de favoris, pas de vue 3D (remplacée par le plan 2D).

---

## 10. Prochaine étape

**Non implémenté** : la vue des réservations et des commandes côté gérant et personnel. Les données existent déjà (`Reservation`, `Order`, statuts, `AuditLog`), mais aucun écran ni route n'y accède.

À faire, dans cet ordre :

1. **Routes gérant** : `GET /api/restaurants/:id/reservations` (filtres par date et statut) et `GET /api/restaurants/:id/orders`, protégées par `requireManagedRestaurant`.
2. **Changements de statut** : `PENDING → CONFIRMED → PREPARING → READY → DELIVERED` pour les commandes, et `SEATED`, `COMPLETED`, `NO_SHOW` pour les réservations. Prévoir l'annulation côté gérant et la notification du client.
3. **Écrans** : remplacer les données statiques de `ReservationsWidget`, `FloorPlanView` et `staff/_lib/board.ts` par ces routes.
4. **Complément** : carte « Your next reservation » sur l'accueil client, notifications (table `Notification`), avis (`Review`), et un suivi en temps réel (SSE) pour le service.

---

*Licence : logiciel propriétaire et confidentiel (voir `LICENSE`). Toute utilisation, copie ou diffusion est interdite sans autorisation écrite de l'auteur.*
