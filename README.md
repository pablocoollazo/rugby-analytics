# Rugby Analytics

Web application for live rugby match tracking and season analytics. Built with React + Firebase as a Progressive Web App (PWA).

**Live app:** https://rugby-analytics-8d187.web.app

**Repository:** https://github.com/pablocoollazo/applicazioni-web

---

## Features

- **Live match tracking** — score, scrums, line-outs, rucks, tackles, kicks, set plays, substitutions
- **Squad management** — per-match squad selection with jersey numbers and position slots
- **Playbook** — club-level play library linked to position slots; auto-fills squad for each match
- **Season analysis** — points progression, individual player stats, set play analysis, stats by opponent, weather correlation
- **Role-based access** — admin, coach and player roles with different views and permissions
- **PWA** — installable on mobile, service worker with runtime caching

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19 + React Router 7 |
| Build | Vite 8 |
| Backend / DB | Firebase (Auth + Firestore) |
| Hosting | Firebase Hosting |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |
| Weather | Open-Meteo API (no key required) |

---

## Running locally

### Prerequisites

- Node.js 18+
- A Firebase project (or use the `.env` provided)

### Setup

```bash
git clone https://github.com/pablocoollazo/applicazioni-web.git
cd applicazioni-web
npm install
```

Create a `.env` file in the project root (see `.env` attached to the submission email):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

---

## Test accounts

The following accounts are pre-loaded with sample data (club: **Test RFC**):

| Role | Email | Password |
|---|---|---|
| Admin | admin@test.com | Test1234! |
| Coach | coach@test.com | Test1234! |
| Player | player@test.com | Test1234! |

### What to try

**As admin (`admin@test.com`):**
- `/club` — member management and access codes
- `/players` — squad with Thrower/Kicker badges
- `/playbook` — club play library
- `/analysis` — full season breakdown, play analysis and stats by opponent

**As coach (`coach@test.com`):**
- Open any match — tabs: Match (live score + set pieces), Squad, Players (per-player events), Plays (set plays)
- Score tab: record a try (+5 → select scorer → Confirm) or a kick (+2/+3 → Made ✓ / Missed ✗)

**As player (`player@test.com`):**
- Home shows "My profile" quicklink instead of Players/Playbook
- Analysis shows personal stats and "My set plays" section

---

## Role system

| Feature | Admin | Coach | Player |
|---|---|---|---|
| Record match events | ✓ | ✓ | — |
| Manage squad | ✓ | ✓ | — |
| View Players list | ✓ | ✓ | — |
| View Playbook | ✓ | ✓ | — |
| View Analysis | ✓ | ✓ | ✓ |
| View own profile | ✓ | ✓ | ✓ |
| Manage club members | ✓ | — | — |

Roles are assigned via club codes (coach code / player code) shown in the Club page.

---

## Project structure

```
src/
├── components/
│   ├── matchStats/       # Match recording sections (Score, Scrum, Lineout, Ruck,
│   │                     #   PlayerEvents, Plays, Squad, Substitution)
│   └── Navbar.jsx
├── context/
│   └── AuthContext.jsx   # Auth + club state, role resolution
├── hooks/
│   └── useMatchEvents.js # Firestore subscription + event→stats derivation
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Register.jsx      # 3-step flow: account → club → player profile
│   ├── Matches.jsx
│   ├── MatchDetails.jsx  # Tabbed match view with live stats
│   ├── Players.jsx
│   ├── PlayerProfile.jsx
│   ├── Analysis.jsx      # Season stats, charts, play analysis, rival breakdown
│   ├── Playbook.jsx
│   └── ClubMembers.jsx
└── utils/
    ├── firestore.js      # All Firestore read/write helpers
    ├── positions.js      # Rugby position slot definitions (1–15)
    ├── weather.js        # Open-Meteo geocoding + weather fetch
    └── notifications.js  # Web Notifications API wrapper
```

---

## Data model (Firestore)

```
clubs/{clubId}
  name, coachCode, playerCode, members[], city

matches/{matchId}
  clubId, rival, date, location, city, weather,
  pointsFor, pointsAgainst, result, status

matches/{matchId}/events/{eventId}
  type, playerId, position, [event-specific fields]

stats/{matchId}
  squad: [{ playerId, slot, jersey, isStarter }]

players/{playerId}
  clubId, userId, name, surname, displayName,
  mainPosition, altPositions, dateOfBirth,
  isThrower, isKicker

playbook/{playId}
  clubId, name, slots: [1–15]
```

All match statistics are stored as events and derived client-side via `useMatchEvents.js`.
