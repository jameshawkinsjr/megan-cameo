# 🎁 Birthday Cameo Reveal

A one-page birthday surprise: tap to open → fireworks, flying emojis, confetti, horns and a brass "Happy Birthday" → a present appears → tap it → the Cameo video is revealed → after she plays it, a **Save video to my phone** button appears.

Plain HTML, no build step, no dependencies. All sounds are generated in the browser.

## Setup

1. **Add the video.** Download the Cameo (it's an `.mp4`) and save it as `video/cameo.mp4`. GitHub's per-file limit is 100 MB; Cameos are normally well under that.
2. **Personalize (optional).** Edit `CONFIG` at the top of the `<script>` in `index.html` (name, subtitle, how long the party lasts, download filename).
3. **Publish on GitHub Pages.** Repo → Settings → Pages → *Deploy from a branch* → pick the branch and `/ (root)` → Save. After a minute it's live at `https://<username>.github.io/megan-cameo/`.
4. **Make the QR code** from that URL, then **test it on your own iPhone** before printing.

## Things to know

- **Sound on iPhone:** browsers only allow sound after a tap, which is why there's a "Tap to open" screen. The page asks Safari to play even in silent mode (iOS 16.4+), but have her volume up just in case.
- **Saving the video:** on iPhone the button opens the share sheet, and **Save Video** puts it straight into Photos. If that isn't available, it downloads to Files → Downloads instead.
- **Privacy:** GitHub Pages on a free account requires a public repo, so the video file is publicly reachable by anyone who finds the URL/repo. If that matters, deploy the same folder to Vercel (drag-and-drop or `vercel deploy`) from a private repo instead. No code changes needed.
- **Test locally:** `python3 -m http.server` in this folder, then open http://localhost:8000.

---

# 🍸 Kyle or Bethenny? Bravo personality quiz (`/quiz/`)

A separate page at **`/quiz/`** (e.g. `https://jameshawkinsjr.github.io/megan-cameo/quiz/`). The birthday page at `/` is unchanged.

Flow: intro (Summer House vs Real Housewives; no names until the reveal) → 8 questions (progress bar, back button, answers kept) → "producers are reviewing the footage" → result (Kyle, Bethenny, or Bravo Hybrid on a 4–4 tie) with score split → "Get a second opinion" → "Reveal your Cameo surprises" → both Cameo cards (the winner's first, marked YOUR ALTER EGO; swipeable on phones) → restart.

Every screen is sized to fit an iPhone screen without scrolling; images shrink to the space that's left.

| What | Where |
| --- | --- |
| Questions, results copy, names | `quiz/config.js` (`QUESTIONS`, `RESULTS`, `PEOPLE`) |
| Cameo videos | `quiz/config.js` → `CAMEOS.kyle` / `CAMEOS.bethenny` |
| Portraits | `quiz/images/kyle.jpg`, `quiz/images/bethenny.jpg` |
| Show logos (intro) | `quiz/images/summer-house-logo.png`, `quiz/images/rhony-logo.png` |
| Scoring logic | `quiz/scoring.js` |
| UI / styles | `quiz/app.js`, `quiz/quiz.css` |

**Cameo videos:** for each person set `videoSrc` to a local file (e.g. `"../video/kyle.mp4"`, i.e. a file in the repo's `video/` folder) or a direct `.mp4` link to play it on the page, *or* set `externalUrl` to the Cameo share link to show a "Watch on Cameo" button. Unset = a "coming soon" card.

**Tests:** `node --test` (scoring unit tests, no dependencies). The quiz uses ES modules, so open it through a server (`python3 -m http.server`, then http://localhost:8000/quiz/), not by double-clicking the file.
