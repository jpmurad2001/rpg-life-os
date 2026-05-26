# ⚔️ RPG Life OS

> *"The world is a dungeon. Your life is the quest. Every task completed is a monster slain."*

![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

**RPG Life OS** is a dark fantasy productivity system inspired by the *Shadow Slave* universe. It transforms your daily routine into an RPG: every task you complete earns XP, every habit forged increases your attributes, every boss you defeat drops rare Memory fragments, and every level-up unlocks new power in your Talent Tree.

Stop managing a to-do list. Start surviving the dungeon.

---

## ✨ Features

### 📋 Kanban Board — Weekly Quest Planner
A drag-and-drop weekly planning board where each column represents a day of the week. Create task cards, assign XP values, and replicate cards across multiple days with a single click. Completing a task triggers XP gain, attribute point allocation, and a chance at a loot drop.

### 🗺️ Hub World — Point-and-Click Citadel
An interactive citadel map where each location is an unlockable module:
- **Temple of Echoes** — Memory & Echo inventory
- **The Forge** — Loadout & Talent Tree management
- **Market District** — Finance & economy overview
- **War Room** — Boss encounter chamber
- **Hall of Records** — Analytics & progression dashboard

Each district unlocks at different rank thresholds, reinforcing a true sense of progression.

### 🏋️ Workout Templates — Training Regimens
Create and name reusable training templates composed of individual exercises with sets, reps, and description notes. Execute a session to log it and earn physical attribute (FOR) XP. Track your training history directly from the Citadel.

### 💸 Finance Module — Economy of the Shadow
Track income and expense entries synced in real-time to Firestore under your user account. Categorise transactions, view monthly balance summaries, and integrate gold-earning from completed quests into a unified economy view.

### ⚔️ Boss System — High-Stakes Encounters
Challenge multi-stage Boss encounters where each subtask represents a point of HP. Land **critical hits** (bonus XP on difficult tasks) and ensure every boss kill yields a **guaranteed Memory drop** plus a chance at a bonus item. Boss fights are the highest-risk, highest-reward activity in the system.

### ✨ XP & Attribute System — The Five Pillars
All activity feeds into five core attributes visualised as a **pentagonal radar chart**:

| Attribute | Abbreviation | Domain |
|-----------|-------------|--------|
| Intelligence | INT | Mental & learning tasks |
| Fortitude | FOR | Physical training & endurance |
| Awareness | AVE | Planning, reflection & focus |
| Artistry | ART | Creative & artistic output |
| Charisma | CAR | Social, communication & leadership |

Attribute points shape your radar silhouette and gate certain Talent Tree nodes.

### 💎 Memory & Echo Drops — Loot System
Completing quests triggers an **18% RNG roll** for a Memory or Echo fragment drop, saved directly to your Firestore inventory. Boss defeats guarantee one drop with an additional RNG roll for a bonus item. Memories are the core equippable items of the system.

### 🧠 Talent Tree — 27 Nodes, 5 Branches, 2 Ultimates
Spend Skill Points (earned on level-up) across a branching talent tree:
- **5 attribute branches** — specialise in your dominant playstyle
- **27 passive nodes** — XP multipliers, drop rate bonuses, gold modifiers, critical hit chance
- **2 Ultimate nodes** — unlockable at high rank, granting transformative bonuses

Once invested, talents apply globally via the Modifier Engine to all future calculations.

### 🎒 Loadout System — 7 Memory Slots
Equip up to 7 Memories in your active Loadout. Each equipped Memory feeds its bonus stats into the **Modifier Engine**, which recalculates XP multipliers, drop chance bonuses, gold modifiers, and boss damage in real time. Your Loadout is the difference between a wanderer and a Legend.

### 📊 Analytics Dashboard — Chronicle of Progress
- Weekly XP trend line chart
- Task completion rate by day
- Attribute radar chart (pentagonal canvas renderer)
- Boss kill history and drop log
- Finance summary graphs

### 🎵 Ambient Music Player — The Sound of the Abyss
A built-in audio player featuring curated **Dark Fantasy** and **Lo-Fi** playlists to maintain immersion during deep work sessions. Powered by the Web Audio API with volume control and playlist cycling.

### 🏆 Badges & Titles — Marks of Glory
Unlock **Badges** and **Titles** by hitting milestone events: first boss killed, 100 quests completed, full Talent Tree branch, etc. Equip one active Badge and one Title to display on your profile panel.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript ES2022 (ES Modules) |
| Auth | Firebase Authentication (Google Sign-In + Email/Password) |
| Database | Cloud Firestore (per-UID document isolation, real-time sync) |
| Hosting | Firebase Hosting |
| Drag & Drop | Native HTML5 Drag and Drop API |
| Audio | Web Audio API |
| Charts | HTML5 Canvas 2D (custom pentagonal radar renderer) |
| Animations | CSS keyframes + vanilla JavaScript |

> **No build step required in development.** Pure ES modules served directly — just open or serve and play.

---

## 🏛️ Architecture

```
rpg-life-os/
├── index.html                   # Entry point & module shell
├── src/
│   ├── engine/                  # Core gamification logic
│   │   ├── state.js             # Central reactive state store
│   │   ├── xpEngine.js          # XP calculation & level-up logic
│   │   ├── dropEngine.js        # RNG drop system (Memory/Echo)
│   │   ├── modifierEngine.js    # Loadout bonus aggregation
│   │   ├── economyEngine.js     # Gold & finance calculations
│   │   └── hud.js               # Gamification HUD overlay
│   │
│   ├── modules/                 # Feature modules (lazy-loaded)
│   │   ├── quests/              # Kanban board & task lifecycle
│   │   ├── board/               # Weekly planner UI
│   │   ├── battle/              # Boss encounter system
│   │   ├── talents/             # Talent tree renderer & logic
│   │   ├── inventory/           # Memory & Echo management
│   │   ├── loadout/             # Slot equip/unequip logic
│   │   ├── finance/             # Income/expense tracker
│   │   ├── workout/             # Training templates & sessions
│   │   ├── hub/                 # Point-and-click citadel map
│   │   ├── analytics/           # Dashboard & chart rendering
│   │   ├── badges/              # Badge & title unlock system
│   │   └── audio/               # Ambient music player
│   │
│   ├── firebase/                # Firebase integration layer
│   │   ├── firebase.js          # App init & config
│   │   ├── auth.js              # Authentication flows
│   │   └── db.js                # Firestore CRUD helpers
│   │
│   ├── config/                  # Static game data (no server required)
│   │   ├── badges.js            # Badge & title definitions
│   │   ├── echoes.js            # Echo item catalogue
│   │   ├── memories.js          # Memory item catalogue
│   │   ├── frames.js            # UI frame & avatar frame data
│   │   └── loot.js              # Drop table configuration
│   │
│   └── ui/                      # Presentation layer
│       ├── app.js               # Root orchestrator & router
│       └── styles/              # One CSS file per feature module
│           ├── base.css
│           ├── hub.css
│           ├── board.css
│           ├── battle.css
│           ├── talents.css
│           ├── inventory.css
│           ├── analytics.css
│           └── ...
└── firebase.json                # Firebase Hosting config
```

---

## 🚀 Setup & Installation

### Prerequisites
- A modern browser with ES Module support (Chrome 90+, Firefox 90+, Edge 90+)
- [Node.js](https://nodejs.org/) (optional, for local serving)
- A [Firebase](https://firebase.google.com/) project (for auth & data persistence)

### Clone & Run

```bash
git clone https://github.com/jpmurad2001/rpg-life-os.git
cd rpg-life-os

# No build step needed — pure ES modules

# Serve locally (recommended):
npx serve .

# OR open index.html directly in a modern browser
```

### Firebase Configuration

The Firebase config is embedded in `src/firebase/firebase.js`. To deploy your own instance:

1. Create a new project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → Sign-in methods:
   - Google
   - Email/Password
3. Create a **Firestore Database** (production mode, then apply security rules)
4. Update the config object in `src/firebase/firebase.js`:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

5. Deploy:

```bash
firebase deploy --only hosting
```

---

## 🎮 Gameplay Loop

```
┌──────────────────────────────────────────────┐
│            Complete a Quest (Task)           │
│      XP gained + Attribute Points + Gold     │
└─────────────────────┬────────────────────────┘
                      │
                      ▼ 18% RNG chance
┌──────────────────────────────────────────────┐
│         Memory / Echo Fragment Drops         │
│         (saved to Firestore inventory)       │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│    Equip Memory in Loadout Slot (1–7)        │
│  Modifier Engine applies bonus to all future │
│      XP / Gold / Boss / Drop calculations    │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│     Level Up → +1 Skill Point earned         │
│  Spend in Talent Tree → Unlock multipliers,  │
│     drop bonuses, crit chance, and more      │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│           Enter Boss Encounter               │
│  Defeat HP subtasks → Critical Hit chance   │
│  100% guaranteed Memory drop on kill        │
│  + RNG roll for a second bonus item         │
└──────────────────────────────────────────────┘
```

---

## 🗂️ Roadmap

- [ ] Mobile-responsive layout for on-the-go quest logging
- [ ] Party System — shared boss raids with other users
- [ ] Weekly Dungeon — time-limited challenge events
- [ ] Push Notifications for daily quest reminders
- [ ] Offline support via Service Workers

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

> *"In a world where shadows devour the weak, every completed task is a declaration of war against entropy."*
>
> — RPG Life OS

