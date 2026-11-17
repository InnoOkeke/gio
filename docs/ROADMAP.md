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

**A. A turtle with a personality (characters).**
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

**I. Gentle rewards.**
Badges, a growing garden or aquarium that fills up as the child learns, and a calm streak that never shames a missed day. No leaderboards against strangers.

**J. Free for every child.**
Keep GIO free for children. Fund it through school and NGO partnerships (Phase 5 classrooms), grants, and cloud credits. Offline-first (Phase 3) so it works where data is scarce. Add more languages as native speakers volunteer, e.g. Yoruba, Hausa, Igbo and Swahili.

### Suggested order after Phase 5

1. A (characters) and I (rewards): small changes that make every existing screen warmer.
2. B (adventure map): reorganises existing quests; foundation for everything after.
3. C (talk with Gio): builds on voice, read-aloud and tutor mode.
4. G (Mathland units) and D (story adventures): the bulk of new content.
5. H (parents), F (songs), E (photo challenges).
