# How Kiro Was Used to Build GIO

> This document is part of the Kiroween 2026 submission. It is updated as the project grows; sections marked *in progress* describe work that is not finished yet.

---

## Kiro IDE

GIO is built inside the Kiro IDE, with Kiro's agent doing the implementation, running the checks, and reviewing its own output in a real browser.

---

## Steering

`.kiro/steering/project-overview.md` is always included. It is where the project's non-negotiable rules live, so every request to the agent starts from them:

- **Faithful to Logo**: the turtle, the classic commands and learning by debugging stay at the centre.
- **AI as a bridge, not a replacement**: plain English in, real Logo out, and the child always sees and can edit the code.
- **Safe by design**: AI output is Logo run by GIO's own interpreter and is never executed as JavaScript.
- **No secrets in the repo**: keys live only in the gitignored `.env`.
- Tech stack, the `{ success, data?, error? }` API envelope, file layout and port 3001.

The safety rule shaped the architecture directly: because AI output must be Logo, the interpreter in `src/logo/` is pure TypeScript with no browser APIs, so the server can parse and test-run every AI answer with the exact code the browser uses before sending it back.

---

## Agent Hooks

| Hook | Trigger | What it does |
|---|---|---|
| `test-on-save.json` | Saving a file in `src/logo`, `src/ai`, `src/api`, `src/db` or `tests` | Runs the Vitest suite |
| `lint-on-save.json` | Saving any `.ts` / `.tsx` file | Runs ESLint |
| `compliance-check.json` | Session start | Asks the agent to check hackathon rules: `.kiro/` tracked, MIT licence, README mentions Resurrection and Logo, `.env` ignored, port 3001, no secrets in tracked files |

---

## Property-based testing

`tests/logo.test.ts` uses fast-check alongside ordinary unit tests. The properties encode facts about turtle geometry and robustness that a handful of examples would miss:

- A regular polygon of any side count and size returns the turtle to where it started.
- `REPEAT n [FD d]` always travels exactly `n × d`.
- The heading always stays in `[0, 360)` after any sequence of turns.
- Random token soup never crashes the interpreter: it either runs or reports a kid-friendly problem with a line number.

A property also caught a real precision issue: after seven turns of 51.43°, the heading lands a hair above 0°, so the test now compares angles in both directions instead of expecting exactly 0 or 360.

---

More property tests guard the newer features:

- Every valid program translates to Python and JavaScript with every Logo line accounted for, Python indentation always correct, and JavaScript braces always balanced.
- Any block program survives the round trip blocks → Logo → blocks unchanged.
- A regular polygon drawn starting from any corner is recognised as the same drawing by the quest checker.

Every quest is tested with a kid-style solution that differs from the target, and every debugging quest is tested to fail with its buggy starter code.

## Checking against real Python

Unit tests can only check translated text. `scripts/check-python.ts` (`npm run check:python`) goes further: it runs twelve translated programs in real CPython turtle and compares the final position, heading, pen state and every arc end point with GIO's interpreter. All of them match, including the 25 arcs of the rainbow flower and two games where the script presses keys in both GIO and Python. That is the evidence behind the claim that GIO's Python draws the same picture.

## A live test that changed the language

Asking the turtle helper for a game, the model named a procedure `TO DRAW-CIRCLE`. GIO reads `-` as minus, so it rejected the program twice, and its message ("I wasn't expecting - here") didn't explain why. That message would confuse a child just as much. The fix was in two places: the parser now says "Names can't have a dash (-) in them, because - means minus. Try DRAW_CIRCLE instead.", and the prompt states the naming rule. The next request produced a working game.

## Real-browser review

Each UI change was checked with headless Microsoft Edge screenshots at laptop and phone sizes. This caught issues that the type checker and tests could not:

- The Run button sat below the fold on a 1000px-tall laptop screen, so the stage is now sized to the viewport.
- Component CSS was loaded after Tailwind's utilities, so `hidden` didn't hide the "New" button on phones and squeezed out the drawing's title.
- Speed-control emoji rendered inconsistently on Windows and were replaced with drawn icons.

---

## AI integration

`src/ai/logo-assistant.ts` builds its prompt from the interpreter's own command table (`src/logo/primitives.ts`), so the model is only ever told about commands GIO actually supports. Each answer is parsed, run and bounds-checked; if it fails, the model gets one chance to fix it using GIO's exact error message and the offending line. If it still fails, the real problem is shown. GIO never substitutes a made-up program.

---

## Specs *(in progress)*

Requirements, design and task files for GIO will live in `.kiro/specs/`.

---

## MCP *(in progress)*

The AWS MCP server (via the AWS Agent Toolkit) is configured for this workspace's Kiro setup. How it is used will be documented here as the deployment work begins.
