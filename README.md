# 🐢 GIO — Logo Resurrected for the Modern Web

> **Kiroween 2026 Hackathon Entry — Category: Resurrection**
> Logo (1967) was the language Seymour Papert and colleagues created so children could learn to think by programming a turtle. It faded from classrooms as computers changed. GIO brings it back: kids describe a drawing in plain English, AI writes real Logo code they can read and change, and the turtle draws it.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Kiroween 2026](https://img.shields.io/badge/Kiroween-2026-orange.svg)](https://kiroween.devpost.com)

**▶ Try it: [https://2edol04wyk.execute-api.eu-north-1.amazonaws.com](https://2edol04wyk.execute-api.eu-north-1.amazonaws.com)** (runs on AWS; see [deploy/README.md](./deploy/README.md))

---

## What is GIO?

Logo gave children a "turtle" they could steer with simple commands like `FORWARD 100` and `RIGHT 90`. Papert's idea was that kids learn best by building things and debugging them. GIO keeps that idea and adds one modern piece: an AI helper that turns plain English into Logo, so a child can start from what they want to draw and learn the code from there.

### The Resurrection

| Then (Logo, 1967–1990s) | Now (GIO, 2026) |
|---|---|
| School computer labs | Runs in any browser, on a laptop, tablet or phone |
| Learn the commands first | Describe it in English, then read and edit the real Logo |
| Turtle on a monochrome screen | An animated turtle that walks, turns and draws step by step |
| Programs saved on floppy disks | Drawings saved and shared by link |

---

## Two ways to code, by age

| | **Little Turtles** (under 8) | **Turtle Coders** (8–12) |
|---|---|---|
| Coding | Big tap-to-add blocks with − / + numbers | Real Logo text with autocomplete and tap-to-insert chips |
| Other languages | "See the code" shows the Logo behind the blocks | Every program shown live in **Python** and **JavaScript** |
| Asking the turtle | Voice or text; answers always fit in blocks | Voice or text; answers use the full language |
| Quests | 60 picture quests on 10 stages | 120 coding quests on 20 stages: shapes, loops, colours, debugging, functions, variables, coordinates, chance, games, recursion, fractals, physics, a capstone |
| Explain my code | A short story of what the turtle does | Line-by-line points that name the programming idea and the Python equivalent |

Kids pick a mode on the first screen and can switch any time. A link can choose the mode, e.g. `/?mode=little` for a class of younger kids. Quest progress and badges stay in the browser: no accounts and no public gallery.

## What works today

- 🐍 **Logo → Python and JavaScript**, translated from the program tree (no AI), with matching lines linked both ways. The Python uses Python's real `turtle` module; `npm run check:python` runs translated programs in CPython and confirms they end in the same place as GIO's turtle.
- 🗺️ **An adventure map of stages**: one stage for each big idea (10 in Little Turtles, 20 in Turtle Coders), each with two units of three quests that get harder from stage to stage. A quest solved with no hint earns a gold star, one solved after a hint earns a silver star that can be replayed for gold. Two different gold stars master a unit, and mastering both units sails the stage. A sailed stage invites a short two-quest review 2 days later, then 7, 21 and 60 days, always optional and never locking anything. Confident kids and adults can **skip ahead** with a skill check (no hints allowed). Sailing the last stage makes you a **Logo Master**: Gio gets a golden shell and you can print a certificate (`docs/STAGES.md` has the details). Progress stays in the browser (gio.progress, gio.path, gio.certificate).
- 🏆 **Quests with automatic checking**: GIO compares the drawing itself (any correct solution passes, mirror images count), shows the target faintly on the stage, and awards a badge for each programming idea.
- 🎮 **Make a game**: `WHEN "up [FD 10]` runs commands each time a key is pressed (up, down, left, right, space), with on-screen buttons for tablets. Kids learn event-driven programming, and the Python version uses the real turtle module's `onkey`. The turtle helper can write games too; GIO test-presses every key before showing one.
- 🍎 **Real games from one sentence**: a game kit of `WHEN "tick` (a game clock, 10 times a second), `DOT x y` (apples, coins), `DISTANCE x y` (did I catch it?), `SHOW` (a scoreboard, e.g. `SHOW SENTENCE "Score: :score`) and `GAMEOVER`, plus `>=`, `<=` and `<>`. Asking for "a game where I catch apples and win at 5 points" produces a working game.
- 🎵 **Music and movies**: `PLAY [C D E 2 R G]` plays notes (a number after a note is how many beats it lasts, `R` is a rest), `SETTEMPO 90` sets the speed, `WAIT 30` pauses for half a second, and `FRAME` shows the picture so far as one picture of a flipbook movie. Notes are made in the browser, keys on the stage light up as they play, and Save > Movie turns a `FRAME` program into a GIF with one picture per `FRAME`. Little Turtles get Note, Next picture and Wait blocks.
- 🗣️ **Voice controls the app**: say "run it", "stop", "slower", "faster", "explain", "save", "undo", "hint" or "start over". Only short exact phrases count as commands, so "draw a fast car" is still a drawing.
- 🔊 **Reads aloud**: the turtle speaks its messages with the browser's built-in voices, on by default for Little Turtles, so children who can't read yet can still use GIO.
- 🎤 **Talk to the turtle** using the browser's built-in speech recognition (tap to talk; shown only where the browser supports it).
- **Tutor mode**: "I'm stuck" gives one hint at a time (Think, Look, Fix). GIO's own interpreter finds the line, and hints never change progress or stickers.
- **A first win in one tap**: a brand-new child taps one big button, the turtle draws a star, and then they pick a colour to make it their own.
- **Movies (animated GIF)**: any drawing can be saved as a "watch me draw" GIF, made on the child's own device.
- **Drawing files (SVG)**: save a drawing at real size in millimetres for printers, plotters and cutters.
- 🐢 **A real Logo interpreter**, written for GIO: `FD`, `BK`, `RT`, `LT`, `PU`, `PD`, `HOME`, `CS`, `SETXY`, `SETHEADING`, `ARC`, `CIRCLE`, `SETPENCOLOR`, `SETPENSIZE`, `SETBG`, `PRINT`, `REPEAT`, `TO … END` procedures with inputs, recursion with `STOP`, `MAKE` variables, `IF` / `IFELSE`, arithmetic, `RANDOM` and `REPCOUNT`.
- 💬 **Error messages written for kids**, with the line highlighted: *"I don't know how to FORWRD. Did you mean FORWARD?"*
- 🤖 **Ask the turtle**: describe a drawing (or a change to the current one) and GIO writes Logo with short comments a child can read. Every AI answer is parsed and test-run by GIO's interpreter before it reaches the editor.
- ▶️ **Watch it draw**: Run, Pause, Step one command at a time, and three speeds. The line being run lights up in the code.
- 🧩 **Tap-to-insert commands and colours**, plus autocomplete with a one-line explanation of every command.
- 🔗 **Save and share**: every drawing gets a link. Only the person who saved it can change it; anyone with the link can watch it draw and save their own copy.
- 🖼️ **Download** the drawing as a picture.
- 🔒 **Safe by design**: AI output is only ever Logo run by GIO's interpreter, never JavaScript. Runaway loops are stopped with a friendly message, and the AI endpoint is rate limited.
- **Kid-safe AI**: every request to the turtle helper (a drawing idea, and the code sent to "Explain") is checked before any code is written. First a local blocklist (src/ai/blocklist.ts) turns away obvious bad words instantly. It matches whole words, so "class" and "Scunthorpe" pass, and it sees through tricks like `sh1t`, `f.u.c.k`, `fuuuck` and `f*ck`. Then Qwen answers SAFE or UNSAFE (src/ai/moderation.ts). Amazon Bedrock Guardrails does not work on this account, so the model does the check. Turned-down requests get a friendly "Let's draw something else!" in the turtle's bubble and a toast, not an error (HTTP 422 with `code: "redirect"`).
- **Moderation fails closed**: if the safety check cannot run or gives no clear answer (Bedrock down, timeout, odd reply), the request is refused with "I can't check that idea right now. Please try again in a moment." (HTTP 503) and nothing is generated. For a children's product, an unchecked request should never get through. The cost is that a Bedrock outage stops the turtle helper, which would not work then anyway. Writing and running Logo by hand never depends on it.
- **Privacy page for parents** at `/privacy`, linked from the studio footer and the age picker. It lists what GIO stores (only saved drawings: title and code), what stays in the browser, what is sent to Amazon Bedrock, and that Chrome and Edge speech recognition sends audio to Google or Microsoft.
- **The daily AI limit survives restarts**: `AI_DAILY_LIMIT` (requests per UTC day for the whole site) is counted in SQLite (table `ai_daily_usage`, one atomic upsert), so restarting or redeploying does not reset it. Requests turned away by the blocklist do not use up the limit; requests the moderation check judges unsafe or cannot check do, because the model was called. The per-IP limiter is still in memory.

---

## Real Python in the browser

In the Python tab, Turtle Coders can press **Run this Python** and watch their translated Logo run as real Python (Pyodide, CPython compiled to WebAssembly), or press **Make it mine** to copy it into an editor and change it.

- **The sandbox.** Python runs in a hidden `<iframe sandbox="allow-scripts">` (never `allow-same-origin`), so it has no access to GIO's storage, cookies or API. Inside the frame it runs in a Web Worker made from a blob, and after Python loads the worker's `fetch`, `XMLHttpRequest`, `WebSocket` and `importScripts` are removed. The frame's Content-Security-Policy allows only scripts from GIO's own server, a blob worker and WebAssembly. The page checks that every message comes from that frame and accepts only known event types with numbers, colours and text in range. A program that runs for 10 seconds, or makes more than 20 000 events, is stopped.
- **Self-hosted and opt-in.** The engine (about 13 MB, 7.5 MB compressed) is served from GIO's own server under `/py/pyodide-314.0.8/`. It downloads only after a child taps "Get Python ready".
- **GIO's own `turtle`.** Pyodide has no window, so GIO ships a `turtle` module (`src/ui/runtime/python/`) that writes the same events the Logo interpreter does, and the same stage, speeds, Pause, Step and exports work. Supported: `forward/back/right/left` (and `fd`, `bk`, `rt`, `lt`), `goto/setpos`, `setx`, `sety`, `setheading`, `home`, `circle` (CPython's own algorithm), `dot`, `penup/pendown`, `pensize`, `pencolor/color`, `bgcolor`, `hideturtle/showturtle`, `xcor/ycor/pos/heading/distance/towards`, `clear/reset`, `write` (the scoreboard), `tracer/update` (movies), `onkey`, `ontimer`, `mode("standard" or "logo")`, `Screen()` and `Turtle()` (one drawing turtle, plus hidden turtles that write). `time.sleep` becomes a wait and `winsound.Beep` a note. Anything else, like `begin_fill`, stops with a plain message saying GIO's turtle can't do it yet.
- **Python edits are local.** A child's own Python is kept only in the browser (`gio.python`). Save and Share keep the Logo, and Python can't turn back into Logo. Python runs never earn stickers, stars or quest progress, and while a quest is open the Python tab is read-only.
- `tests/python-runtime.test.ts` loads Pyodide in Node and checks that every program in `scripts/check-programs.ts` ends in the same place and draws the same, with the same notes and pauses, as GIO's Logo interpreter.

---
## Getting Started

### Prerequisites

- Node.js 20+
- An [Amazon Bedrock API key](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)

### Installation

```bash
git clone https://github.com/InnoOkeke/gio.git
cd gio
npm install
```

### Configuration

```bash
cp .env.example .env
# Add your Amazon Bedrock API key, Region and model ID
```

### Run in development

```bash
npm run dev
```

The API runs on port 3001 and the UI on [http://localhost:5173](http://localhost:5173) (Vite proxies `/api` to the API).

### Run in production

```bash
npm run build
npm start
```

Open [http://localhost:3001](http://localhost:3001). The API and the built UI are both served from port 3001.

### Checks

```bash
npm run typecheck && npm run lint && npm test
```

---

## How it is built

| Part | Where | Notes |
|---|---|---|
| Logo language | `src/logo/` | Lexer, parser, interpreter. Pure TypeScript with no browser APIs, so the browser and the server use the same code. |
| Turtle player | `src/ui/runtime/player.ts` | Replays the interpreter's events on a canvas at the chosen speed. |
| UI | `src/ui/` | React 18, Vite, Tailwind, CodeMirror 6. |
| API | `src/api/` | Express. Every response is `{ success, data?, error? }`. |
| Storage | `src/db/` | SQLite via better-sqlite3. |
| AI | `src/ai/` | Amazon Bedrock (Qwen3 Coder) through the OpenAI-compatible Chat Completions API. |
| Tests | `tests/` | Vitest, with property-based tests (fast-check) for the interpreter. |

---

## How Kiro Was Used

See [`docs/kiro-usage.md`](./docs/kiro-usage.md).

---

## Kiroween 2026

This project was built during the [Kiroween 2026 Hackathon](https://kiroween.devpost.com) submission period (October 30 – December 4, 2026).

**Category:** Resurrection — bringing Logo and its turtle back to life for a new generation of kids.

---

## License

[MIT](./LICENSE)
