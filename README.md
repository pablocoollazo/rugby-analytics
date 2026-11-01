# Rugby Analytics

Web application for live rugby match tracking and season analytics. Built with React + Firebase as a Progressive Web App (PWA).

Built as a course project during my Erasmus year at Università di Pisa.

**Live app:** https://rugby-analytics-8d187.web.app

---

## Features

- **Live match tracking** — score, scrums, line-outs, rucks, tackles, kicks, set plays, substitutions
- **Squad management** — per-match squad selection with jersey numbers and position slots
- **Playbook** — club-level play library linked to position slots; auto-fills squad for each match
- **Season analysis** — points progression, individual player stats, set play analysis, stats by opponent, weather correlation
- **Role-based access** — admin, coach and player roles with different views and permissions
- **PWA** — installable on mobile, service worker with runtime caching
- **Notifications** — Web Notifications API: squad saved (with incomplete formation warning), match closed

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
- A Firebase project (Auth and Firestore enabled)

### Setup

```bash
git clone https://github.com/pablocoollazo/rugby-analytics.git
cd rugby-analytics
npm install
```

Create a `.env` file in the project root with your Firebase config:

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
