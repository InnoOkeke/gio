# GIO Roadmap

GIO's goal: make thinking-by-coding as fun and as free as the best kids' learning apps, for children everywhere, including on a shared phone with patchy data.

## Where we stand

Built: a real Logo interpreter, two age modes (Little Turtles under 8, Turtle Coders 8–12), an AI turtle helper, Logo → Python and JavaScript, quests with automatic checking, games (`WHEN` keys and ticks), voice control and read-aloud, save and share links. Live on AWS over HTTPS.

## Committed phases

| Phase | Features |
|---|---|
| 1. Safety and trust | Kid-safe AI filter, privacy page for parents, durable AI limits, daily backups |
| 2. Learning | Tutor mode ("I'm stuck" hint ladder), 60-second first win, shareable animated replays, SVG export |
| 3. Reach | Logo in English, Nigerian Pidgin, French and Spanish; installable offline app (PWA) for low-cost phones |
| 4. Creativity | Music (`PLAY`) and animation commands; real Python running in the browser |
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

**B. An adventure map (learning path).**
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

## Stages: quests that keep getting harder

Today's quests become Stage 1. Turtle Coders get **20 stages**, Little Turtles get **10**, each harder than the last, with about 5–6 automatically checked quests per stage. Stages unlock in order; confident kids and adults can skip ahead by passing a short skill check. Finishing the last stage earns a printable **Logo Master certificate** for parents and a **golden shell** for Gio.

Draft Turtle Coders stages: 1 First steps, 2 Shape Shore (polygons, 360 ÷ sides), 3 Loop Lagoon (nested loops, spirals), 4 Colour Cove, 5 Recipe Reef (procedures), 6 Ingredient Island (procedures with inputs), 7 Variable Valley, 8 Grid Garden (coordinates), 9 Decision Desert (`IF`), 10 Surprise Springs (`RANDOM`), 11 Event Forest (keys), 12 Clockwork Canyon (game clock, score), 13 Recursion Ridge, 14 Fractal Falls, 15 Bug Bay (fix broken programs), 16 Tiny Code Temple (fewest commands), 17 Mirror Mountains (symmetry, tiling), 18 Physics Peak (bouncing, gravity), 19 Game Studio (multi-level games), 20 Logo Master (capstone).

Little Turtles stages stay gentle and block-based: shapes, colours, patterns, simple loops and simple games. Stages extend the adventure map (B): stages are its islands.

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

## Build order

At most two workflows run at once, paired so they don't edit the same files.

| Wave | Pair |
|---|---|
| Now | Phase 2 (learning) · B adventure map |
| 1 | Stages 20/10 + certificate · Phase 4 (music, animation, Python in the browser) |
| 2 | 9 Gio's Adventure · Phase 3 offline app (PWA) |
| 3 | Phase 3 languages (translates everything built so far) · 1 Daily puzzle + 2 WhatsApp stickers + 8 colouring and `FILL` |
| 4 | Phase 5 classrooms · C talk with Gio |
| 5 | G Mathland units + D story adventures · 3 seasonal events + 5 ghost race + 6 take-turns |
| 6 | H parents + F songs + E photo challenges · 7 AR floor turtle |
