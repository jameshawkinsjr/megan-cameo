# Megan's birthday surprises

Two pages, plain HTML, no build step, no dependencies. Published with GitHub Pages:

| Page | URL | Files |
| --- | --- | --- |
| 🍸 Kyle or Bethenny? Bravo personality quiz | `https://jameshawkinsjr.github.io/megan-cameo/` (root, on the printed QR code) | `index.html`, `app.js`, `config.js`, `scoring.js`, `quiz.css`, `images/`, `audio/` |
| 🎁 Birthday Cameo reveal | `https://jameshawkinsjr.github.io/megan-cameo/birthday/` | `birthday/index.html` |

Both use the Cameo video in `video/cameo.mp4`. The old `/quiz/` address redirects to the root.

**Publishing:** Repo → Settings → Pages → *Deploy from a branch* → this branch and `/ (root)`. Changes go live a minute or two after each push.

**Test locally:** `python3 -m http.server` in this folder, then open http://localhost:8000/ (quiz) or http://localhost:8000/birthday/. The quiz uses ES modules, so it has to be served, not opened by double-clicking the file.

**Privacy:** GitHub Pages on a free account requires a public repo, so the files (videos included) are publicly reachable by anyone who finds the URL or repo.

---

## 🍸 Bravo personality quiz (`/`)

Flow: intro (Summer House vs Real Housewives; no names until the reveal) → 8 questions (progress bar, back button, answers kept) → 12-second "very complicated math" scoring screen → result (Kyle, Bethenny, or Bravo Hybrid on a 4–4 tie) with score split → "Get a second opinion" → "Reveal your Cameo surprises" → both Cameo cards (the winner's first, marked YOUR ALTER EGO; swipeable on phones) → restart.

Every screen is sized to fit an iPhone screen without scrolling; images shrink to the space that's left.

| What | Where |
| --- | --- |
| Questions, results copy, names | `config.js` (`QUESTIONS`, `RESULTS`, `PEOPLE`) |
| Cameo videos | `config.js` → `CAMEOS.kyle` / `CAMEOS.bethenny` |
| Portraits | `images/kyle.jpg`, `images/bethenny.jpg` |
| Show logos (intro) | `images/summer-house-logo.png`, `images/rhony-logo.png` |
| Scoring logic | `scoring.js` |
| Music (quiz theme, scoring track), scoring-screen length | `config.js` → `MUSIC`, `SCORING_SECONDS`; files in `audio/` |
| UI / styles | `app.js`, `quiz.css` |

**Music:** a "Tap for sound" banner on the intro starts the quiz theme (phones need a tap before any sound); otherwise it starts with the quiz. It loops through the questions and fades out as the scoring screen starts its own track. A mute button shows in the corner while music plays.

**Cameo videos:** for each person set `videoSrc` to a file in the repo's `video/` folder (e.g. `"video/kyle.mp4"`) or a direct `.mp4` link to play it on the page, *or* set `externalUrl` to the Cameo share link to show a "Watch on Cameo" button. Unset = a "coming soon" card. Cards with a playable video get a "Save video to my phone" button (share sheet → Save Video on iPhone).

**Tests:** `node --test` (scoring unit tests, no dependencies).

---

## 🎁 Birthday Cameo reveal (`/birthday/`)

Tap to open → fireworks, flying emojis, confetti, an airhorn and a brass "Happy Birthday" → a present appears → tap it → the Cameo video is revealed → after she plays it, a **Save video to my phone** button appears.

- **Personalize:** edit `CONFIG` at the top of the `<script>` in `birthday/index.html` (name, subtitle, how long the party lasts, download filename).
- **Sound on iPhone:** browsers only allow sound after a tap, which is why there's a "Tap to open" screen. The page asks Safari to play even in silent mode (iOS 17+), but have her volume up just in case.
- **Saving the video:** on iPhone the button opens the share sheet, and **Save Video** puts it straight into Photos. If that isn't available, it downloads to Files → Downloads instead.
