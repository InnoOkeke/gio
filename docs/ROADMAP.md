# GIO Roadmap

GIO's goal: make thinking-by-coding as fun and as free as the best kids' learning apps, for children everywhere, including on a shared phone with patchy data.

## Where we stand

Built: a real Logo interpreter, two age modes (Little Turtles under 8, Turtle Coders 8–12), an AI turtle helper, Logo → Python and JavaScript, quests with automatic checking, games (`WHEN` keys and ticks), voice control and read-aloud, save and share links. Live on AWS over HTTPS.

## Committed phases

| Phase | Features |
|---|---|
| 1. Safety and trust | Kid-safe AI filter, privacy page for parents, durable AI limits, daily backups |
| 2. Learning (built) | Tutor mode ("I'm stuck" hint ladder), 60-second first win, shareable animated replays, SVG export |
| 3. Reach | Logo in English, Nigerian Pidgin, French and Spanish; installable offline app (PWA) for low-cost phones |
| 4. Creativity (built) | Music (`PLAY`, `SETTEMPO`, `WAIT`) and flipbook animation (`FRAME`); real Python running in the browser. Deferred: instruments, chords and music stickers |
| 5. Classrooms | Class codes without accounts, private class gallery, teacher dashboard |

Not planned for now: robots over Bluetooth, uptime alarm, GitHub Actions deploys.

## Learning from Giggle Academy

[Giggle Academy](https://giggleacademy.com/about-us) is a free, nonprofit learning platform founded by Changpeng Zhao, aimed at reaching children worldwide, including those without access to school. It reports [2 million learners](https://www.giggleacademy.com/blog/giggle-academy-reaches-2-million-learners-free-english-education-for-every-child-worldwide). What makes children come back, from its own materials:

- **Characters kids look for.** A shapeshifting buddy, [Mai](https://www.giggleacademy.com/blog/meet-mai-the-shapeshifting-english-buddy-from-giggle-academy), plays games, listens and praises; a parrot, [Kiki](https://www.giggleacademy.com/blog/giggle-academy-update-v1390-new-features-to-boost-your-childs-english-learning), runs speaking games. Parents report children going looking for a bunny every day.
- **Voice first.** AI-guided lessons built around speaking, with the [App Store listing](https://apps.apple.com/us/app/giggle-academy-learn-and-play/id6739128662) claiming over 95% speaking participation.
- **Short themed units.** About [ten minutes](https://www.giggleacademy.com/blog/what-a-ten-minute-giggle-academy-lesson-actually-looks-like) around one theme, with repetition, laid out as a learning path; children practise until confident.
- **Real life.** Lessons tied to everyday situations; snap a photo of an object to learn its word.
- **Songs and storybooks**, with read-along.
- **Parents included.** Parent tools and a learning centre; parents say it doesn't wear them out, and some learn along.
- **Badges, points and levels**, designed to build patience rather than compulsive use.

*Content was rephrased for compliance with licensing restrictions.*

### Positioning: don't fight Giggle on English

Giggle Academy teaches language, with a funded team producing content at scale. GIO should own the other half of early learning: **thinking, maths and making things**. Papert built Logo as "Mathland", a place where children learn geometry and logic by moving a turtle. A family can use both apps; GIO becomes the place where a child goes to *make* something.

### Roadmap to a Giggle-level experience

**A. A turtle with a personality (characters). Built.** Gio has moods, nine friends and shell stickers (the original plan follows).
Gio the turtle gets a name, moods, a voice and reactions: happy dances when code works, a curious tilt when it doesn't. Friends join as the child learns: one character per big idea (a looping octopus for `REPEAT`, a squirrel who stores things for `MAKE`, an owl for `IF`). The child decorates Gio's shell with stickers earned by learning, not by tapping.

**B. An adventure map (learning path). Built.** The quest list is now a map of 3 islands in Little Turtles and 8 in Turtle Coders, each with two units of three quests (66 quests). A quest solved with no hint earns a gold star, a quest solved after help earns a silver star, two different gold stars master a unit, and a sailed island grows its tree, sticker and friend in the garden. Sailed islands invite a quiet two-quest review after 2, 7, 21 and 60 days (the original plan follows).
Replace the quest list with a world map of islands, one per concept (Shape Shore, Loop Lagoon, Variable Valley, Event Forest, Recursion Ridge). Each island holds ten-minute units around one theme, with built-in repetition. Mastery-based: a child moves on after showing they can do it twice without hints. Earlier islands come back as short reviews days later (spaced repetition).

**C. Talk with Gio (voice conversation).**
Turn voice input into a conversation: Gio asks questions, listens, praises specific things ("I love how you used REPEAT there!"), and gives tutor-mode hints out loud. Little Turtles can do a whole session without reading.

**D. Story adventures.**
Illustrated story chapters where each page is a coding puzzle: help Gio build a bridge (draw a line of the right length), light a lighthouse (`IF`), plant a garden (`REPEAT`). Story text is read aloud. Stories are local and culturally familiar: a market in Lagos, a football match, a birthday party.

**E. Draw from real life (photo to challenge).**
A child photographs something (a house, a flower, a flag) and the AI turns it into a challenge: "Can you draw this with the turtle?", with a faint target outline and hints. Needs a vision-capable model on Bedrock; check availability on the account first.

**F. Songs and music.**
Builds on Phase 4's `PLAY`: short coding songs ("Repeat, repeat, four times round"), and kids compose tunes with loops, so music teaches patterns.

**G. Maths through the turtle (Mathland).**
Units that teach angles, shapes, symmetry, multiplication (`REPEAT 3 [REPEAT 4 …]`), fractions of a circle and coordinates, aligned to primary school curricula (Nigerian, UK, US). This is where schools and parents see measurable value.

**H. Parents learn along.**
A weekly progress card kept in the browser ("This week Ada learned loops and drew 12 pictures"), suggested things to try together, and a short guide for parents who have never coded. No accounts needed; parents open it on the same device.

**I. Gentle rewards. Built.** Gio's garden shows friends, stickers, a growing scene and a calm week strip, kept in the browser under `gio.rewards` (the original plan follows).
Badges, a growing garden or aquarium that fills up as the child learns, and a calm streak that never shames a missed day. No leaderboards against strangers.

**J. Free for every child.**
Keep GIO free for children. Fund it through school and NGO partnerships (Phase 5 classrooms), grants, and cloud credits. Offline-first (Phase 3) so it works where data is scarce. Add more languages as native speakers volunteer, e.g. Yoruba, Hausa, Igbo and Swahili.

## Stages: quests that keep getting harder (done)

Turtle Coders have **20 stages** (120 quests) and Little Turtles have **10** (60 quests), six automatically checked quests per stage in two units of three, each stage harder than the last. The first stages are the original islands, so no progress was lost. Stages unlock in order, and confident kids and adults can skip ahead: a **skill check** is a few of the "own" quests of the stages being skipped, solved with no hint, Explain or tutor. Passing opens the stage and marks the earlier ones "tested out", and no stars or clears come from it. Finishing the last stage earns a printable **Logo Master certificate** (one landscape page, the typed name stays in the browser) and a **golden shell** for Gio. `docs/STAGES.md` lists every stage with its measured difficulty (`npm run report:stages`).

Turtle Coders stages: 1 Shape Shore, 2 Loop Lagoon, 3 Colour Cove, 4 Bug Burrow, 5 Function Falls, 6 Ingredient Island, 7 Variable Valley, 8 Grid Garden, 9 Decision Dunes, 10 Surprise Springs, 11 Event Forest, 12 Clockwork Canyon, 13 Recursion Ridge, 14 Fractal Falls, 15 Bug Bay, 16 Tiny Code Temple, 17 Mirror Mountains, 18 Physics Peak, 19 Game Studio, 20 Logo Master.

Little Turtles stages are block-based: Shape Shore, Loop Lagoon, Colour Cove, Pen Playground, Flower Fields, Pattern Park, Picture Town, Star Sky, Block Saver and Logo Master Lighthouse. Simple games for Little Turtles are not in the stages. They need new blocks and arrive with Gio's Adventure.

## Fun features

1. **Daily Turtle Puzzle.** One new puzzle a day, the same for everyone, with a spoiler-free emoji result to share (e.g. "GIO #42 🐢 solved in 7 commands ⭐⭐⭐"). No accounts or leaderboards.
2. **WhatsApp stickers.** One tap turns a drawing into a WhatsApp sticker for family chats.
3. **Seasonal events.** Limited-time stages and Gio outfits: Spooky Season (pumpkins, ghost-catching games, haunted houses), then Christmas, Eid, Independence Day and more.
4. *(Maze mode, merged into 9.)*
5. **Race your past self.** Re-solve a quest against a "ghost turtle" replaying your earlier solution. Improvement without comparing kids to each other.
6. **Take-turns drawing.** Two kids on one device add one command each to build a picture together. Works offline.
7. **Turtle on the floor (AR).** Point the phone at the floor and Gio walks and draws on it: the original 1970s floor turtle, back again. Newer phones only.
8. **Colouring pages and `FILL`.** Print any drawing as a colouring sheet; a `FILL` command colours in shapes.
9. **Gio's Adventure, a game you play with code.** A world of levels (forests, rivers, caves, a castle) where kids write commands to get Gio through: walk around rocks, `REPEAT` across a long bridge, `IF` there's a river then swim, collect gems, free trapped friends, beat boss levels. Each world introduces one coding idea; Maze mode is its first world. Blocks for Little Turtles, typed code for Turtle Coders.

## Tablet-first and phone-first layouts (priority)

Kids use tablets and phones more than computers, so these come before new waves and every later feature must keep them working.

- **Layouts per orientation and window size.** Tablet landscape: code left, large stage right. Tablet portrait and phones: stage on top, blocks or code below, AI box folds away. Responds to available width (Split View, Stage Manager, foldables), keeps the child's place on rotation.
- **Touch first.** 48–56 px targets with generous spacing, nothing that needs hover, smooth finger drag-and-drop for blocks with large drop zones, pinch-zoom and pan on the stage, full-screen watch and game modes with thumb-reach GamePad buttons, short vibration on snap or win where supported.
- **Typing on a touch screen.** The editor stays visible above the on-screen keyboard; a command key row (`FD`, `RT`, `REPEAT`, `[ ]`, numbers) above it; hardware keyboards and arrow keys on iPads.
- **Richer big screens.** A wider adventure map and garden side by side in landscape, quest target and child's drawing side by side, crisp art on high-density screens, safe areas respected.
- **Phones.** One-handed reach for main actions, bottom sheets instead of modals, no horizontal scrolling at 360 px, readable text without zoom.
- **Fast on low-cost devices.** Smooth animation on cheap Android tablets and phones; heavy parts load only when needed.
- **Always checked.** Automatic touch-simulated screenshots at 360/390 px phones, iPad mini, iPad, iPad Pro and an Android tablet, portrait and landscape, as a standing check.

## Build order

At most two workflows run at once, paired so they don't edit the same files.

| Wave | Pair |
|---|---|
| Now | Phase 2 (learning) · B adventure map |
| Next (priority) | Tablet-first and phone-first layouts · alongside whichever of Stages / Phase 4 is still running |
| 1 | Stages 20/10 + certificate · Phase 4 (music, animation, Python in the browser) |
| 2 | 9 Gio's Adventure · Phase 3 offline app (PWA) |
| 3 | Phase 3 languages (translates everything built so far) · 1 Daily puzzle + 2 WhatsApp stickers + 8 colouring and `FILL` |
| 4 | Phase 5 classrooms · C talk with Gio |
| 5 | G Mathland units + D story adventures · 3 seasonal events + 5 ghost race + 6 take-turns |
| 6 | H parents + F songs + E photo challenges · 7 AR floor turtle |

### Phase 3, offline app (PWA): done

GIO installs on a phone and drawing, quests, the adventure map, GIF export and the privacy and certificate pages work with no connection. The AI and saving need the internet, and say so kindly. Python needs the internet each time it starts (the locked box cannot use the app cache). Measured by `npm run check:offline` (build 6ba7663a17d3): first load of `/` transfers 1,127,700 bytes uncompressed (8 requests, the Node server does not compress; production nginx does). The offline cache holds 16 files, 1,543,592 bytes raw, 816,168 bytes gzip, with a budget of 15 percent above that. Languages are still open.
