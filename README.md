# ConflictRadar

Real-time code overlap detection for collaborative dev teams. Detects when two
developers are editing the same function — before either one saves or commits.
No AI/ML: overlap detection is rule-based AST comparison.

This repo was built in the order laid out in the project plan — **Week 1
foundations → Week 2 keystroke tracking & Project Codes → Week 3 overlap
detection & live dashboard → Week 4 heatmap, hardening & Docker** — and is
now feature-complete for a solo demo (3+ VS Code windows on one machine,
per your own risk table's primary demo plan).

## Repo layout

```
conflictradar/
├── backend/        Node.js + Express + Socket.io server, MongoDB models
├── dashboard/       Next.js live dashboard
├── extension/       VS Code extension (TypeScript) — the "sensor"
├── scripts/          Standalone AST learning script (no deps on the rest)
└── docs/            Architecture notes, schema diagram
```

## What's built

- **Backend** (`backend/`) — Express health-check; `/project/create` and
  `/project/join` REST endpoints; Socket.io room-per-Project-Code; live
  `activity` ingestion; rule-based overlap detection (Strategy pattern,
  `same-file` / `same-function` / `same-line` severities); alert cooldown
  so a held function doesn't spam alerts; stale-session sweep; a heatmap
  aggregation endpoint.
- **Extension** (`extension/`) — debounced `onDidChangeTextDocument`
  listener; AST function-boundary mapping (Visitor pattern via
  `@babel/traverse`); **New Project** / **Join with Code** commands; live
  socket connection that emits activity and shows a popup on overlap.
- **Dashboard** (`dashboard/`) — join form, live roster, live overlap
  alert feed, polling heatmap panel.
- **Docker Compose** — one command to run backend + MongoDB + dashboard
  together.

## Setup

You need Node.js 18+, and either Docker or a local/Atlas MongoDB instance.

### Option A — Docker Compose (closest to the real demo setup)

```bash
docker compose up --build
```

This builds and starts MongoDB, the backend (`:4000`), and the dashboard
(`:3000`) together. Visit `http://localhost:3000`.

The VS Code extension still runs on your host machine (extensions can't
run inside a container) — see step 3 below, and leave
`conflictradar.backendUrl` at the default `http://localhost:4000`.

### Option B — run each piece yourself

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env   # edit MONGO_URI if you're not running Mongo locally
npm run dev
```

Visit `http://localhost:4000/health` — you should see `{"status":"ok",...}`.

**2. Dashboard**

```bash
cd dashboard
npm install
npm run dev
```

Visit `http://localhost:3000`.

**3. Extension**

```bash
cd extension
npm install
```

Open the `extension/` folder in VS Code and press **F5** — this opens an
"Extension Development Host" window with the extension running.

## Try the full flow

This mirrors your own risk mitigation plan: everything on one laptop,
zero network dependency.

1. With the backend and dashboard running, in the **first** Extension
   Development Host window, run **ConflictRadar: New Project**, enter a
   name (e.g. "Vaibhav"). You'll get a Project Code like `CR-7K2X`.
2. Open the dashboard at `http://localhost:3000`, enter that code and any
   name (e.g. "Dashboard"), click **Join**. You should see 2 developers
   online.
3. Open a **second** Extension Development Host window (F5 again from a
   separate VS Code window on the `extension/` folder), run
   **ConflictRadar: Join with Code** with the same code and a different
   name (e.g. "Priya"). The dashboard's roster should now show 3.
4. Open the **same JS file** in both extension windows, with a named
   function like:
   ```js
   function updateProfile(user) {
     // ...
   }
   ```
5. Start typing inside `updateProfile` in **both** windows within a few
   seconds of each other. After the debounce (~700ms), you should see:
   - A **warning popup** in both VS Code windows naming the other
     developer
   - A new entry in the dashboard's **Overlap Alerts** panel, tagged
     `same-function` (or `same-line` if you're editing the exact same
     lines)
   - After a few overlaps, the **Overlap Heatmap** panel shows
     `yourfile.js · updateProfile` climbing in count

If step 5 doesn't fire: check the ConflictRadar output channel in both
windows (`View → Output → ConflictRadar`) — it logs every edit's AST
mapping locally, so you can see whether the line is being mapped to the
function correctly even before the network part is in play.

## Packaging the extension (`.vsix`)

```bash
cd extension
npm run compile
npx @vscode/vsce package
```

This produces a `.vsix` file teammates can install via **Extensions panel
→ ... → Install from VSIX**, matching your onboarding checklist.

## Known gaps / deliberately out of scope (matches your risk table)

- Only **named** top-level functions and class methods are tracked —
  nested and inline anonymous arrow functions are future work.
- Project Codes don't expire; join validation is format + existence only.
- No auth — anyone with a Project Code can join, matching the "one-time,
  outside-the-app code share" flow in the plan.

## Design reference

See `docs/README.md` for the full data flow, the MongoDB schema, and
the design patterns (Observer, Visitor, Strategy, Pub-Sub) this build uses —
pulled straight from the project plan.
