---
inclusion: always
---

# GIO — Project Steering

## What This Project Is
GIO is a **Kiroween 2026 Resurrection hackathon entry**. It brings back Logo (1967), the language Seymour Papert and colleagues designed so children could learn by programming a turtle, as a browser-based, AI-assisted coding environment for kids. The "resurrection" narrative is central — judges need to feel the connection between the dead technology and this new life.

## Audience
- Children learning to code, plus the parents and teachers who help them.
- Target age range: **not yet decided** — confirm with the user before writing kid-facing copy or difficulty levels.

## Core Principles
- **Faithful to Logo**: the turtle, the classic commands (`FD`, `BK`, `RT`, `LT`, `PU`, `PD`, `REPEAT`, `TO … END`), and learning by debugging are the heart of the app. Don't abstract them away.
- **AI as a bridge, not a replacement**: plain English in, real Logo out. Kids must always see, read and be able to edit the Logo the AI wrote.
- **Safe by design**: AI output is Logo run by GIO's own interpreter. Never execute AI-generated JavaScript.
- **Visual polish matters**: the retro theme should feel authentic to the era. Polish matters for the nostalgia factor.
- **Hackathon compliance**: The `.kiro/` directory must always be committed and never gitignored.

## Tech Stack
- **Backend**: Node.js + Express, TypeScript, ESM
- **Database**: SQLite via better-sqlite3 (no ORM — raw SQL is fine for this scope)
- **Frontend**: React 18, Vite, Tailwind CSS
- **Drag-and-drop**: @dnd-kit/core + @dnd-kit/utilities
- **Code editor widget**: CodeMirror 6
- **AI**: Amazon Bedrock, Qwen3 Coder (`qwen.qwen3-coder-480b-a35b-instruct`) via Bedrock's OpenAI-compatible Chat Completions API on the `bedrock-mantle` endpoint. Bedrock only, no fallback provider. Auth is a Bedrock API key in `AWS_BEARER_TOKEN_BEDROCK`; region and model come from `AWS_REGION` and `BEDROCK_MODEL_ID` (all required, no defaults). Project Region is `eu-north-1`. Claude models are not available on this account.
- **Secrets**: API keys live only in the gitignored `.env`. Never commit `.env` or put real keys in `.env.example`, docs, tests or logs.
- **Script sandboxing**: iframe with sandbox="allow-scripts" attribute

## Port
The app runs on **port 3001** (to avoid conflict with GhostLink on 3000).

## Code Style
- TypeScript strict mode everywhere
- ESM modules
- Named exports preferred
- Async/await only
- All API responses: `{ success: boolean, data?: T, error?: string }`
- React components: functional only, no class components

## Data Flow
- Saved Logo projects live in SQLite on the backend
- Frontend fetches via REST API
- Code being edited is React local state, synced to the backend on save
- Logo runs in GIO's own interpreter in the browser; AI output is never executed as JavaScript

## File Conventions
- API routes: `src/api/routes/<resource>.ts`
- DB layer: `src/db/`
- AI service: `src/ai/`
- React components: `src/ui/components/`
- React pages: `src/ui/pages/`
- Code editor: `src/ui/editor/`
- Logo interpreter and turtle runtime: `src/ui/runtime/`

## Theme Design Notes
- **Classic Mac**: black-and-white 1980s Mac look — white canvas, black border, Chicago/system font, pixel-art buttons with drop shadow, no color (except UI chrome)
- **Modern Dark**: Deep dark background, clean sans-serif, subtle shadows
- **Retro Terminal**: Green (#00ff41) on black (#0d0208), monospace font, scanline effect via CSS — the classic school-lab Logo look
- **Pastel**: Soft pastels, rounded corners, playful feel

## Hackathon Compliance Reminders
- Never add `.kiro/` to `.gitignore`
- MIT LICENSE must be at root and visible
- Category is **Resurrection** — the write-up must clearly explain what Logo was and why it faded
- Demo video under 3 minutes — show the Classic Mac theme for maximum nostalgia impact
