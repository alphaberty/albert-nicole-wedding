# Albert & Nicole · 21 November 2026

A small guest website for the wedding: an interactive 3D wind chime on the landing page, then a short
full-screen flow where each guest chooses a main course, says whether they are interested in an
after-party, and leaves their name and email. Responses are saved to a Google Sheet.

- **Frontend:** React 19 + TypeScript + Vite, Three.js via React Three Fiber, one persistent canvas.
- **Hosting:** GitHub Pages (static build deployed by GitHub Actions).
- **Responses:** Google Sheet + a tiny Apps Script web app (free, no server, no secrets in the repo).

---

## Where to edit things

| What | File |
|---|---|
| Dishes (names + descriptions), dietary label | `src/config/wedding.ts` → `menu` |
| After-party copy and optional details | `src/config/wedding.ts` → `afterParty` |
| Date, times, venue, map link, dress code, welcome text, optional response deadline | `src/config/wedding.ts` → `wedding` |
| Response storage endpoint | GitHub repository variable `VITE_RESPONSES_ENDPOINT` (see below) |

Edit the file, commit, push to `main`. The deploy workflow rebuilds the site automatically.

---

## One-time setup

### 1. Response storage (Google Sheet), about 5 minutes

1. Create a new Google Sheet (any name, e.g. "Wedding responses").
2. In the sheet: **Extensions → Apps Script**. Delete the sample code and paste the contents of
   [`backend/apps-script/Code.gs`](backend/apps-script/Code.gs). Save.
3. **Deploy → New deployment → ⚙ Select type → Web app.**
   - Description: anything
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, approve the permissions prompt (it only needs access to this spreadsheet).
4. Copy the **Web app URL** (ends in `/exec`). Opening it in a browser should show `{"ok":true,...}`.
5. In GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Name: `VITE_RESPONSES_ENDPOINT`
   - Value: the `/exec` URL
6. Re-run the deploy workflow (Actions → Deploy to GitHub Pages → Run workflow), or push any commit.

If you later change the script, use **Deploy → Manage deployments → Edit → Version: New version**
so the same URL keeps working.

### 2. GitHub Pages

1. Push this repository to GitHub (branch `main` or `master`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push. The live URL
   is `https://<your-user>.github.io/<repo-name>/`, and the workflow sets the asset base path
   from the repository name automatically.

---

## Viewing and exporting responses

Open the Google Sheet. The `Responses` tab has one row per guest:

`Submitted at (SGT) · Name · Email · Main course · Main course label · After-party · Dietary notes · Submission ID · Client time (UTC)`

Export: **File → Download → Comma Separated Values (.csv)**.

Notes:
- Several guests may share one email; each named guest is a separate row.
- Double-clicks and retries never create duplicate rows: every response carries a browser-generated
  submission id and the script ignores ids it has already stored.
- The sheet is private to your Google account; the website can only append rows, never read them.

---

## Local development

```bash
npm install
npm run dev
```

Without `VITE_RESPONSES_ENDPOINT` the dev server uses a built-in mock: submissions are logged to
the browser console and kept in `sessionStorage` (nothing is saved anywhere). To point local
development at the real sheet, copy `.env.example` to `.env.local` and fill in the URL.

Handy test switches (dev only):
- `http://localhost:5173/?simulateFailure=1` makes the first submission fail so you can see the retry path.
- `http://localhost:5173/?noWebGL=1` forces the CSS/SVG chime fallback.

```bash
npm run build     # production build in dist/
npm run preview   # serve the production build locally
```

---

## Project layout

```
src/config/wedding.ts        all wedding copy, menu, after-party, storage endpoint
src/lib/audio.ts             synthesised chime tones (Web Audio, starts muted)
src/lib/submit.ts            POST to the Apps Script endpoint, timeout, dedupe id
src/lib/store.tsx            draft answers, validation, submit state
src/scene/chimePhysics.ts    pendulum simulation, striker/tube collisions
src/scene/WindChime.tsx      procedural chime geometry and materials
src/scene/Ornaments.tsx      place setting, ribbon, blossoms, 囍 tile
src/scene/Scene.tsx          persistent canvas, per-section layout, lighting
src/scene/StaticChime.tsx    SVG fallback when WebGL is unavailable
src/components/Sections.tsx  landing, the five steps, thank-you
backend/apps-script/Code.gs  Google Apps Script that appends rows to the sheet
```
