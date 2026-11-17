# 🐢 GIO — Logo Resurrected for the Modern Web

> **Kiroween 2026 Hackathon Entry — Category: Resurrection**
> Logo (1967) was the language Seymour Papert and colleagues created so children could learn to think by programming a turtle. It faded from classrooms as computers changed. GIO brings it back: kids describe a drawing in plain English, AI writes real Logo code they can read and change, and the turtle draws it.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Kiroween 2026](https://img.shields.io/badge/Kiroween-2026-orange.svg)](https://kiroween.devpost.com)

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
| Quests | 8 picture quests | 10 coding quests: loops, functions, inputs, decisions, recursion, debugging |
| Explain my code | A short story of what the turtle does | Line-by-line points that name the programming idea and the Python equivalent |

Kids pick a mode on the first screen and can switch any time. A link can choose the mode, e.g. `/?mode=little` for a class of younger kids. Quest progress and badges stay in the browser: no accounts and no public gallery.

## What works today

- 🐍 **Logo → Python and JavaScript**, translated from the program tree (no AI), with matching lines linked both ways. The Python uses Python's real `turtle` module; `npm run check:python` runs translated programs in CPython and confirms they end in the same place as GIO's turtle.
- 🏆 **Quests with automatic checking**: GIO compares the drawing itself (any correct solution passes, mirror images count), shows the target faintly on the stage, and awards a badge for each programming idea.
- 🎤 **Talk to the turtle** using the browser's built-in speech recognition (tap to talk; shown only where the browser supports it).
- 🐢 **A real Logo interpreter**, written for GIO: `FD`, `BK`, `RT`, `LT`, `PU`, `PD`, `HOME`, `CS`, `SETXY`, `SETHEADING`, `ARC`, `CIRCLE`, `SETPENCOLOR`, `SETPENSIZE`, `SETBG`, `PRINT`, `REPEAT`, `TO … END` procedures with inputs, recursion with `STOP`, `MAKE` variables, `IF` / `IFELSE`, arithmetic, `RANDOM` and `REPCOUNT`.
- 💬 **Error messages written for kids**, with the line highlighted: *"I don't know how to FORWRD. Did you mean FORWARD?"*
- 🤖 **Ask the turtle**: describe a drawing (or a change to the current one) and GIO writes Logo with short comments a child can read. Every AI answer is parsed and test-run by GIO's interpreter before it reaches the editor.
- ▶️ **Watch it draw**: Run, Pause, Step one command at a time, and three speeds. The line being run lights up in the code.
- 🧩 **Tap-to-insert commands and colours**, plus autocomplete with a one-line explanation of every command.
- 🔗 **Save and share**: every drawing gets a link. Only the person who saved it can change it; anyone with the link can watch it draw and save their own copy.
- 🖼️ **Download** the drawing as a picture.
- 🔒 **Safe by design**: AI output is only ever Logo run by GIO's interpreter, never JavaScript. Runaway loops are stopped with a friendly message, and the AI endpoint is rate limited.

## Coming next

- 🎮 **Make a game**: arrow-key events, so kids learn event-driven programming.
- ☁️ A public deployment on AWS.

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
