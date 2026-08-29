# Per-Project Lark Milestone Log — Design

Date: 2026-08-30
Status: Approved

## Motivation

The user works across many independent project directories (this repo, plus
others such as "Personal List/App" and "PRD Drafting"). They want a
lightweight, opt-in way for any of those projects to keep a running,
human-readable log of milestones, checkpoints, and decisions in Lark Drive —
separate from the local git history — so that important context survives
outside of chat transcripts and is easy to review later. Local files (and
git) remain the actual working copy; Lark is a narrative log layer only, not
a mirror of file contents.

## Scope decisions (from brainstorming)

- **Per-project opt-in**, not global. Each project that wants this pastes a
  standard snippet into its own `CLAUDE.md`. Projects that don't paste it are
  unaffected.
- **One subfolder + one log doc per project.** A "project" is a local
  top-level working directory (one CLAUDE.md). If a project later needs
  finer-grained logs (e.g. multiple independent apps inside one repo), that
  is an explicit variant to design separately, not assumed here.
- **Log trigger is Claude's judgment.** Entries are written when a real
  milestone, checkpoint, or notable decision occurs — not on every edit, and
  not only on request.
- **Log format is a Lark Docx** (native online document), not a plain
  Markdown file. Chosen for in-app viewing/commenting; edits go through the
  `lark-doc` block-based API rather than text patches.
- **Lark holds the log only** — no periodic uploads of working files. Local
  filesystem + existing git repo stay the sole source of truth for code.
- **Folder/doc creation requires one-time confirmation**, not silent
  auto-creation. After that one confirmation, tokens are cached so no further
  prompts are needed.
- **Subfolder naming**: matches the local project directory name (e.g.
  `iCompass`). Once created, the subfolder token and log-doc token are cached
  by being written back into that project's `CLAUDE.md`, so later sessions
  never need to re-resolve or re-search for them.

## Components

### 1. Lark structure

- Root folder **"Claude"** — token `Jg0mfbe2LlAJLBdQxa9ls9pRgqh`
  (`https://www.larksuite.com/drive/folder/Jg0mfbe2LlAJLBdQxa9ls9pRgqh`).
  Already exists, currently empty.
- Per opted-in project: one subfolder under the root, named after the local
  project directory, containing exactly one Lark Docx named
  `"<ProjectName> Log"`.

### 2. CLAUDE.md snippet (opt-in mechanism)

Pasted manually into any project's `CLAUDE.md` to enable this workflow for
that project:

```markdown
## Lark Milestone Log
This project logs milestones/checkpoints/decisions to Lark Drive.
- Parent folder: "Claude" (token: Jg0mfbe2LlAJLBdQxa9ls9pRgqh)
- Subfolder: "<ProjectName>" (token: <fill in after creation>)
- Log doc: "<ProjectName> Log" (token: <fill in after creation>)

Workflow:
- If the subfolder/log doc tokens above are blank, run /startwork
  (or ask the user once, then create them yourself).
- Whenever a real milestone, checkpoint, or notable decision happens during
  a session, append an entry to the log doc:
    ## YYYY-MM-DD — <short title>
    <2-5 sentences: what happened, why, any decision made>
- Skip routine edits, typo fixes, or exploratory dead ends.
- This log is notes/decisions only — local files (and git) remain the
  actual working copy; nothing here mirrors file contents.
```

`<ProjectName>` is filled in with the actual local directory name when the
snippet is added to a project.

### 3. `/startwork` command

Location: `~/.claude/commands/startwork.md` (personal — available in every
project on this machine, without per-project copying).

Purpose: make Lark immediately usable for the rest of the session — both
"authenticated" and "knows where to log" — in one explicit step at the start
of a work session, so neither has to be discovered or re-explained mid-task.

Idempotent; safe to run any time, including when everything is already set
up.

Steps, in order:

1. **Auth check.** Run `lark-cli auth status --json --verify`.
   - If the user identity is `ready`/valid, continue.
   - If missing or expired: proactively run the re-auth flow — initiate
     `lark-cli auth login --domain all --no-wait --json` (or a narrower
     `--domain`/`--scope` if the user prefers), generate a QR code via
     `lark-cli auth qrcode`, send both the URL and QR image to the user, ask
     them to complete it, then (after they confirm) run
     `lark-cli auth login --device-code <code>` to finish. This mirrors the
     flow already used earlier in this project. Confirm success via
     `auth status` before moving on.
2. **Logging-instruction check.** Look for a `## Lark Milestone Log` section
   in the current project's `CLAUDE.md`.
   - **Missing entirely**: this project hasn't opted in. Tell the user, and
     offer to add the standard snippet above (with `<ProjectName>` filled in
     from the local directory name). Only add it if the user confirms.
   - **Present, tokens blank**: confirm once with the user, then:
     a. Create the subfolder via `lark-cli drive +create-folder` under the
        root token, named after the local project directory.
     b. Create a Lark Docx named `"<ProjectName> Log"` inside that subfolder.
     c. Edit the project's `CLAUDE.md`, filling in both tokens in place.
     d. Report the log doc's URL to the user.
   - **Present, tokens already filled in**: nothing to create; proceed.
3. **Confirm ready.** Report back (briefly) that Lark auth is valid and the
   log doc is known, so the rest of the session can both manipulate Lark
   directly (no further auth prompts expected) and knows to append
   milestones/decisions without being reminded again.

`/startwork` is intentionally scoped to only this Lark-readiness check — not
a general "start of session" ritual (no git-status/TODO summarizing, etc.).
That could be a separate command later if wanted, but is out of scope here.

### 4. Ongoing logging behavior

Passive — no command involved. Driven entirely by the `## Lark Milestone
Log` instructions in `CLAUDE.md` plus Claude's own judgment about what
counts as a milestone during the session. Entries are appended to the end of
the log doc via `lark-doc`, one dated heading + short paragraph per entry.

## Error handling / edge cases

- **Local folder renamed/moved**: harmless. Once created, the subfolder and
  doc are identified by their cached tokens in `CLAUDE.md`, not by name, so a
  local rename doesn't break logging (the Lark-side names will just look
  slightly stale, which is cosmetic only).
- **Lark auth expires mid-session** (after a successful `/startwork`): if a
  later `lark-doc`/`lark-cli` write fails due to auth, surface this to the
  user rather than silently dropping the log entry; offer to re-run the
  re-auth flow.
- **Write failures for other reasons** (network, permission, rate limit):
  report to the user; do not retry silently in a loop.
- **`CLAUDE.md` edited to remove the section**: `/startwork` and passive
  logging simply stop applying to that project going forward; no cleanup of
  already-created Lark resources happens automatically.

## Out of scope

- Global (all-projects) enablement — explicitly rejected in favor of
  per-project opt-in.
- Mirroring or versioning actual working files in Lark — log doc only.
- Sub-project/"per-app" granularity within a single repo — not designed here;
  would need its own follow-up if it turns out to be needed.
- A general-purpose "start of session" ritual beyond Lark readiness.
