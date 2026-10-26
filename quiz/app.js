import { PEOPLE, CAMEOS, QUESTIONS, RESULTS, MUSIC, SCORING_SECONDS } from "./config.js";
import { scoreQuiz, formatPercent } from "./scoring.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TOTAL = QUESTIONS.length;

const state = {
  current: 0,
  answers: Array(TOTAL).fill(null), // chosen option index per question
  busy: false,                      // true while a transition is running
  run: 0,                           // bumped on restart so stale timers bail out
  score: null,
};

/* ============================================================
   Tiny DOM helper
   ============================================================ */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") el.className = v;
    else if (k === "style") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

/* ============================================================
   Portraits: configured image, falling back to a monogram card
   ============================================================ */
const imageStatus = {}; // key -> "ok" | "missing"

function portrait(key, { caption = true } = {}) {
  const p = PEOPLE[key];
  const fallback = h("div", { class: "portrait__fallback" },
    h("span", { class: "portrait__mono", "aria-hidden": "true" }, p.initials));
  const fig = h("figure", { class: `portrait is-${key}` }, fallback);
  const describeFallback = () => { fallback.setAttribute("role", "img"); fallback.setAttribute("aria-label", p.alt); };

  if (p.image?.src && imageStatus[key] !== "missing") {
    const img = h("img", { class: "portrait__img", alt: p.alt, width: 800, height: 1000, decoding: "async" });
    img.style.setProperty("--pos", p.image.position || "50% 25%");
    img.addEventListener("load", () => { imageStatus[key] = "ok"; img.classList.add("is-loaded"); });
    img.addEventListener("error", () => { imageStatus[key] = "missing"; img.remove(); describeFallback(); });
    img.src = p.image.src;
    fig.append(img);
  } else {
    describeFallback();
  }

  if (caption) {
    fig.append(h("figcaption", { class: "portrait__caption", "aria-hidden": "true" },
      h("span", { class: "portrait__name" }, p.name),
      h("span", { class: "portrait__show" }, p.showShort || p.show)));
  }
  return fig;
}

/* Show logo card (no names, so nothing is spoiled before the reveal),
   falling back to a typographic wordmark of the show */
const logoStatus = {}; // key -> "ok" | "missing"

function showCard(key) {
  const { logo = {}, wordmark = {} } = PEOPLE[key];
  const fallback = h("div", { class: "portrait__fallback show-card__wordmark" },
    wordmark.above ? h("span", { class: "wordmark__minor" }, wordmark.above) : null,
    h("span", { class: "wordmark__main" }, wordmark.main),
    wordmark.below ? h("span", { class: "wordmark__minor" }, wordmark.below) : null);
  const fig = h("figure", { class: `portrait show-card is-${key}` }, fallback);

  if (logo.src && logoStatus[key] !== "missing") {
    const img = h("img", { class: "show-card__logo", alt: logo.alt || "", decoding: "async" });
    img.addEventListener("load", () => {
      logoStatus[key] = "ok";
      img.classList.add("is-loaded");
      fig.classList.add("has-logo");
      if (logo.plate === "light") fig.classList.add("is-plate-light");
      fallback.setAttribute("aria-hidden", "true");
    });
    img.addEventListener("error", () => { logoStatus[key] = "missing"; img.remove(); });
    img.src = logo.src;
    fig.append(img);
  }
  return fig;
}

const duo = (card = portrait, extraClass = "") => h("div", { class: `duo ${extraClass}` },
  card("kyle"),
  h("span", { class: "duo__vs", "aria-hidden": "true" }, "vs"),
  card("bethenny"));

/* ============================================================
   Screens
   ============================================================ */
function show(id, { focus = true } = {}) {
  for (const s of document.querySelectorAll(".screen")) {
    s.hidden = s.id !== id;
    s.classList.remove("is-entering");
  }
  const el = $(id);
  void el.offsetWidth; // restart the entrance animation
  el.classList.add("is-entering");
  window.scrollTo(0, 0);
  if (focus) el.querySelector("[tabindex='-1']")?.focus({ preventScroll: true });
}

/* ============================================================
   Quiz
   ============================================================ */
function renderQuestion() {
  const i = state.current, q = QUESTIONS[i], n = i + 1;

  $("qCount").textContent = `Question ${n} of ${TOTAL}`;
  const bar = $("progress");
  bar.setAttribute("aria-valuemax", TOTAL);
  bar.setAttribute("aria-valuenow", n);
  bar.setAttribute("aria-valuetext", `Question ${n} of ${TOTAL}`);
  $("progressFill").style.width = `${(n / TOTAL) * 100}%`;

  const back = $("backBtn");
  const first = i === 0;
  back.disabled = first;
  back.setAttribute("aria-hidden", first ? "true" : "false");
  back.tabIndex = first ? -1 : 0;

  $("qKicker").textContent = q.kicker;
  $("qText").textContent = q.text;

  const list = $("answers");
  list.classList.remove("is-locked");
  list.replaceChildren(...q.options.map((opt, idx) =>
    h("button", {
      class: "answer", type: "button", "aria-pressed": String(state.answers[i] === idx),
      onclick: () => choose(idx),
    },
      h("span", { class: "answer__letter", "aria-hidden": "true" }, String.fromCharCode(65 + idx)),
      h("span", { class: "answer__text" }, opt.text),
      h("span", { class: "answer__tag" }, h("span", { "aria-hidden": "true" }, "✓"), "Your pick"))));

  $("nextBtn").hidden = state.answers[i] === null;
}

async function goTo(index, direction = "forward") {
  const card = $("qcard");
  card.classList.toggle("is-back", direction === "back");
  if (!reduceMotion) {
    card.classList.remove("is-entering");
    card.classList.add("is-leaving");
    await wait(220);
  }
  state.current = index;
  renderQuestion();
  card.classList.remove("is-leaving", "is-entering");
  void card.offsetWidth;
  card.classList.add("is-entering");
  $("qText").focus({ preventScroll: true });
}

function choose(idx) {
  if (state.busy) return;
  state.answers[state.current] = idx;
  const buttons = $("answers").querySelectorAll(".answer");
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === idx)));
  $("answers").classList.add("is-locked");
  advance(reduceMotion ? 150 : 450); // let the selection register before moving on
}

async function advance(delay = 0) {
  if (state.busy) return;
  state.busy = true;
  const run = state.run;
  await wait(delay);
  if (run !== state.run) return;
  if (state.current < TOTAL - 1) await goTo(state.current + 1);
  else await finish(run);
  if (run === state.run) state.busy = false;
}

async function goBack() {
  if (state.busy || state.current === 0) return;
  state.busy = true;
  await goTo(state.current - 1, "back");
  state.busy = false;
}

async function finish(run) {
  const score = scoreQuiz(QUESTIONS, state.answers);
  if (!score.complete) { // shouldn't happen, but never show a result for a partial quiz
    await goTo(state.answers.findIndex((a) => a === null), "back");
    return;
  }
  state.score = score;
  Music.stop("quiz");
  Music.play("scoring");
  show("tally");
  await Scoring.run(SCORING_SECONDS * 1000);
  if (run !== state.run) return;
  Music.stop("scoring");
  showMuteButton(false);
  renderResult(score);
  show("result");
  Confetti.burst(score.result);
}

/* ============================================================
   Result
   ============================================================ */
function renderResult(s) {
  const r = RESULTS[s.result];
  const isHybrid = s.result === "hybrid";
  const kyleLabel = `${s.kyleScore}/${s.total} — ${formatPercent(s.kylePercentage)}`;
  const bethLabel = `${s.bethennyScore}/${s.total} — ${formatPercent(s.bethennyPercentage)}`;

  const stage = isHybrid
    ? h("div", { class: "stretch result__stage result__stage--duo" }, duo((key) => portrait(key, { caption: false })))
    : h("div", { class: `stretch result__stage is-${s.result}`, style: { "--halo": "var(--accent-glow)" } }, portrait(s.result, { caption: false }));

  const kyleSeg = h("span", { class: "split__seg split__seg--kyle" });
  const bethSeg = h("span", { class: "split__seg split__seg--bethenny" });

  $("result").replaceChildren(
    h("p", { class: "eyebrow" }, "The results are in"),
    stage,
    h("h2", { id: "resultTitle", class: `display result__title ${isHybrid ? "" : `is-${s.result}`}`, tabindex: "-1" },
      h("span", { class: "line line--small" }, r.headline),
      h("span", { class: "line line--name", style: { "--name-color": isHybrid ? "var(--champagne)" : "var(--accent)" } }, r.name)),
    h("p", { class: "result__subtitle" }, r.subtitle),
    h("section", { class: "scorecard", "aria-label": "The official tally" },
      h("div", {
        class: "split", role: "img",
        "aria-label": `Kyle ${s.kyleScore} of ${s.total}, ${formatPercent(s.kylePercentage)}. Bethenny ${s.bethennyScore} of ${s.total}, ${formatPercent(s.bethennyPercentage)}.`,
      }, kyleSeg, bethSeg),
      h("dl", { class: "tally" },
        h("div", { class: "is-kyle" }, h("dt", {}, "Kyle"), h("dd", {}, kyleLabel)),
        h("div", { class: "is-bethenny" }, h("dt", {}, "Bethenny"), h("dd", {}, bethLabel)))),
    h("p", { class: "result__desc" }, r.description),
    h("ul", { class: "traits", "aria-label": "Your personality traits" }, r.traits.map((t) => h("li", {}, t))),
    h("p", { class: "diagnosis" }, "Your official diagnosis: ", h("strong", {}, r.diagnosis)),
    h("button", { class: "btn btn--primary", type: "button", id: "secondOpinionBtn", onclick: () => show("verdict") },
      "Get a second opinion ", h("span", { "aria-hidden": "true" }, "→")));

  // Animate the split bar from empty to the real proportions
  requestAnimationFrame(() => requestAnimationFrame(() => {
    kyleSeg.style.width = `${s.kylePercentage}%`;
    bethSeg.style.width = `${s.bethennyPercentage}%`;
  }));
}

/* ============================================================
   Cameo finale
   ============================================================ */
function revealCameos() {
  const result = state.score?.result;
  if (!result) return;
  const order = result === "bethenny" ? ["bethenny", "kyle"] : ["kyle", "bethenny"];
  const cards = order.map((key) => cameoCard(key, key === result));
  const track = h("div", { class: "cameo-track" }, cards);

  // Phone carousel: dots + hint, kept in sync with swiping
  const dots = cards.map((card, i) => h("button", {
    class: "pager__dot", type: "button", "aria-current": String(i === 0),
    "aria-label": `Show ${PEOPLE[order[i]].name}’s Cameo`,
    onclick: () => track.scrollTo({ left: card.offsetLeft - track.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" }),
  }));
  const hint = h("span", { class: "pager__hint" }, "Swipe for a second opinion →");
  const pager = h("div", { class: "pager" }, dots, hint);
  let currentCard = 0;
  track.addEventListener("scroll", () => {
    const i = Math.round(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth) * (cards.length - 1));
    if (i === currentCard) return;
    currentCard = i;
    dots.forEach((d, j) => d.setAttribute("aria-current", String(j === i)));
    hint.style.visibility = i === 0 ? "visible" : "hidden";
    pauseVideos(); // don't keep playing a card that's been swiped away
  }, { passive: true });

  $("cameos").replaceChildren(
    h("header", { class: "cameos__head" },
      h("h2", { id: "cameosTitle", tabindex: "-1" }, "A word from the professionals")),
    track,
    pager,
    h("p", { class: "finale" }, "“Because one Bravo opinion just wasn’t enough.”"),
    h("div", { class: "finale-actions" },
      h("button", { class: "link-btn", type: "button", onclick: backToResult }, "← Back to my results"),
      h("button", { class: "link-btn", type: "button", onclick: restart }, "Retake the quiz")));

  show("cameos");
  Confetti.burst("hybrid", 0.5);
}

function backToResult() {
  pauseVideos();
  show("result");
}

function cameoCard(key, featured) {
  const p = PEOPLE[key];
  const c = CAMEOS[key] || {};
  const frame = h("div", { class: "cameo__frame" });
  const save = c.videoSrc ? saveButton(key) : null;
  mountMedia(frame, key, {
    onPlay: () => save?.prefetch(),                 // start downloading in the background while she watches
    onError: () => save?.button.remove(),           // nothing to save if the video can't load
  });
  const media = h("div", { class: "cameo__media" }, frame);
  return h("article", { class: `cameo is-${key} ${featured ? "cameo--featured" : ""}`, "aria-labelledby": `cameo-${key}-name` },
    featured ? h("p", { class: "cameo__badge" }, "YOUR ALTER EGO") : null,
    h("header", { class: "cameo__head" },
      portrait(key, { caption: false }),
      h("div", {},
        h("p", { class: "cameo__label" }, c.label || ""),
        h("h3", { class: "cameo__name", id: `cameo-${key}-name` }, p.name),
        h("p", { class: "cameo__show" }, p.show))),
    media,
    save?.button);
}

/* Save to phone: on iPhone the share sheet's "Save Video" puts it in Photos.
   iOS only opens that sheet straight from a tap, so the file has to be fully
   downloaded first; elsewhere it falls back to a normal file download. */
function saveButton(key) {
  const p = PEOPLE[key];
  const c = CAMEOS[key];
  const fileName = c.downloadName || `${p.firstName}-Cameo.mp4`;
  const canShareFiles = typeof navigator.canShare === "function";
  const label = "Save video to my phone";
  const button = h("button", { class: "btn btn--ghost cameo__save", type: "button" }, label, h("span", { "aria-hidden": "true" }, " 📲"));
  const status = (text) => { button.firstChild.textContent = text; };
  let file = null, loading = null, waiting = false;

  function prefetch() {
    if (!canShareFiles || file) return Promise.resolve();
    loading ??= (async () => {
      const res = await fetch(c.videoSrc);
      if (!res.ok || !res.body) throw new Error(res.status);
      const total = Number(res.headers.get("content-length")) || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (waiting && total) status(`Getting it ready… ${Math.floor((received / total) * 100)}%`);
      }
      const type = res.headers.get("content-type") || "video/mp4";
      const f = new File(chunks, fileName, { type });
      if (navigator.canShare({ files: [f] })) file = f;
    })().catch(() => { loading = null; });
    return loading;
  }

  function directDownload() {
    const a = h("a", { href: c.videoSrc, download: fileName });
    document.body.append(a); a.click(); a.remove();
  }

  button.addEventListener("click", async () => {
    if (file) {
      try { await navigator.share({ files: [file] }); return; }
      catch (e) { if (e.name === "AbortError") return; } // she closed the share sheet
    }
    if (canShareFiles && !file) {
      if (waiting) return;
      waiting = true;
      button.setAttribute("aria-busy", "true");
      status("Getting it ready…");
      await prefetch();
      waiting = false;
      button.removeAttribute("aria-busy");
      if (file) { // the share sheet needs a fresh tap now that the file is ready
        status("Ready! Tap to save");
        button.classList.add("is-ready");
        return;
      }
      status(label);
    }
    directDownload();
  });

  return { button, prefetch };
}

const safeUrl = (url) => {
  try {
    const u = new URL(url, location.href);
    return /^https?:$/.test(u.protocol) ? u.href : null;
  } catch { return null; }
};

function mountMedia(box, key, { onPlay, onError } = {}) {
  const p = PEOPLE[key];
  const c = CAMEOS[key] || {};
  if (c.videoSrc) {
    const video = h("video", {
      controls: true, playsinline: true, "webkit-playsinline": true, preload: "metadata",
      "aria-label": `Cameo video from ${p.name}`, poster: c.poster || null,
    });
    video.addEventListener("error", () => { box.replaceChildren(placeholder(key, { failed: true })); onError?.(); }, { once: true });
    video.addEventListener("play", () => { pauseVideos(video); onPlay?.(); });
    video.src = c.videoSrc;
    box.append(video);
    return;
  }
  box.append(placeholder(key));
}

function placeholder(key, { failed = false } = {}) {
  const p = PEOPLE[key];
  const c = CAMEOS[key] || {};
  const link = c.externalUrl ? safeUrl(c.externalUrl) : null;
  const icon = h("span", { class: "cameo__icon", "aria-hidden": "true" });
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>';

  const bg = c.poster ? h("img", { class: "cameo__placeholder-bg", src: c.poster, alt: "", onerror: (e) => e.target.remove() }) : null;

  if (link) {
    return h("div", { class: "cameo__placeholder" }, bg, icon,
      h("p", { class: "cameo__placeholder-title" }, "Your Cameo is ready"),
      h("p", { class: "cameo__placeholder-text" }, `A personal message from ${p.firstName}, just for you.`),
      h("a", {
        class: "btn btn--primary", href: link, target: "_blank", rel: "noopener noreferrer",
        "aria-label": `Watch ${p.name}’s Cameo (opens in a new tab)`,
      }, "Watch on Cameo ↗"));
  }

  if (!failed) console.info(`[quiz] No Cameo configured for ${key}. Set CAMEOS.${key}.videoSrc or externalUrl in quiz/config.js.`);
  return h("div", { class: "cameo__placeholder" }, bg, icon,
    h("p", { class: "cameo__placeholder-title" }, failed ? "Technical difficulties" : "Arriving shortly"),
    h("p", { class: "cameo__placeholder-text" }, failed
      ? `${p.firstName}’s video didn’t load. Even Bravo has production delays. Try again in a moment.`
      : `${p.firstName}’s Cameo is still in hair and makeup.`));
}

function pauseVideos(except) {
  document.querySelectorAll("#cameos video").forEach((v) => { if (v !== except) v.pause(); });
}

/* ============================================================
   Restart
   ============================================================ */
function restart() {
  state.run++;
  state.busy = false;
  state.current = 0;
  state.answers = Array(TOTAL).fill(null);
  state.score = null;
  pauseVideos();
  Confetti.stop();
  Scoring.stop();
  Music.stopAll(0.3);
  showMuteButton(false);
  renderSoundBanner();
  $("result").replaceChildren();
  $("cameos").replaceChildren();
  $("qcard").classList.remove("is-leaving", "is-entering", "is-back");
  show("intro");
}

/* ============================================================
   Confetti (skipped entirely for reduced motion)
   ============================================================ */
const Confetti = (() => {
  const canvas = $("confetti");
  const ctx = canvas.getContext("2d");
  const PALETTES = {
    kyle: ["#f39abd", "#e2679a", "#f7efe5", "#e8cfa0", "#ffd6e5"],
    bethenny: ["#e8cfa0", "#c9a45c", "#f7efe5", "#fff3d6", "#9c7a3c"],
    hybrid: ["#f39abd", "#e8cfa0", "#f7efe5", "#c9a45c", "#e2679a"],
  };
  let parts = [], raf = 0, W = 0, H = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function burst(kind = "hybrid", amount = 1) {
    if (reduceMotion) return;
    resize();
    const colors = PALETTES[kind] || PALETTES.hybrid;
    const n = Math.round(170 * amount);
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -Math.PI / 3 : -Math.PI * 2 / 3) + (Math.random() - 0.5) * 0.7;
      const speed = 9 + Math.random() * 13;
      parts.push({
        x: fromLeft ? -10 : W + 10, y: H * 0.75,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: 5 + Math.random() * 6, h: 9 + Math.random() * 10,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, flip: Math.random() * 6,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.y < H + 40);
    for (const p of parts) {
      p.vx *= 0.985; p.vy = Math.min(p.vy + 0.32, 4.5);
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.flip += 0.12;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.flip));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
  }

  function stop() {
    parts = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ctx.clearRect(0, 0, W, H);
  }

  return { burst, stop };
})();

/* ============================================================
   Music: Web Audio so fades work on iPhone (Safari ignores
   <audio>.volume) and the quiz theme loops without a gap
   ============================================================ */
const Music = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, muted = false;
  const playing = {};  // key -> { src, gain } while a track is (about to be) playing
  const decoded = {};  // key -> Promise<AudioBuffer|null>
  // Download early so the first note isn't late; decoding waits for the tap
  const bytes = Object.fromEntries(Object.entries(MUSIC).filter(([, t]) => t?.src).map(([k, t]) =>
    [k, fetch(t.src).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null)]));

  const markState = () => { document.documentElement.dataset.music = Object.keys(playing).join(" "); };

  // Must be called from inside a tap: phones only allow sound after one
  function unlock() {
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {} // play even on silent mode (iOS 17+)
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      const blip = ctx.createBufferSource(); // iOS unlock
      blip.buffer = ctx.createBuffer(1, 1, 22050);
      blip.connect(master); blip.start(0);
    }
    if (ctx.state !== "running") ctx.resume();
  }

  function buffer(key) {
    decoded[key] ??= Promise.resolve(bytes[key])
      .then((ab) => (ab ? new Promise((res, rej) => ctx.decodeAudioData(ab.slice(0), res, rej)) : null))
      .catch(() => null);
    return decoded[key];
  }

  async function play(key) {
    const track = MUSIC[key];
    if (!ctx || !track?.src) return;
    stop(key, 0);
    const slot = {};
    playing[key] = slot; markState();
    const buf = await buffer(key);
    if (!buf || playing[key] !== slot) return; // stopped (or restarted) while loading
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = !!track.loop;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(track.volume ?? 1, now + (track.fadeIn ?? 0.05));
    src.connect(gain).connect(master);
    src.start(now);
    Object.assign(slot, { src, gain });
  }

  function stop(key, fade = MUSIC[key]?.fadeOut ?? 0.5) {
    const slot = playing[key];
    if (!slot) return;
    delete playing[key]; markState();
    if (!slot.src) return;
    const now = ctx.currentTime;
    slot.gain.gain.cancelScheduledValues(now);
    slot.gain.gain.setValueAtTime(slot.gain.gain.value, now);
    slot.gain.gain.linearRampToValueAtTime(0, now + fade);
    slot.src.stop(now + fade + 0.05);
  }

  const stopAll = (fade) => Object.keys(playing).forEach((k) => stop(k, fade));

  function setMuted(value) {
    muted = value;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
  }

  // Pause while the phone is locked / tab hidden, pick back up after
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (Object.keys(playing).length) ctx.resume();
  });

  const isPlaying = (key) => key in playing;

  return { unlock, play, stop, stopAll, setMuted, isPlaying, get muted() { return muted; } };
})();

const ICON_SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const ICON_SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

/* Sound banner at the top of the intro: the first tap starts the music
   (phones need one), after that it's a sound on/off switch */
function renderSoundBanner() {
  const banner = $("soundBanner");
  if (!banner) return;
  const on = Music.isPlaying("quiz") && !Music.muted;
  banner.classList.toggle("is-on", on);
  banner.classList.toggle("is-waiting", !Music.isPlaying("quiz"));
  banner.setAttribute("aria-pressed", String(on));
  $("soundIcon").innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
  $("soundText").textContent = !Music.isPlaying("quiz") ? "Tap for sound" : on ? "Sound on" : "Sound off";
  $("soundHint").textContent = !Music.isPlaying("quiz") ? "Volume up · silent mode off" : on ? "Tap to mute" : "Tap to unmute";
}

function toggleSoundFromBanner() {
  Music.unlock();
  if (!Music.isPlaying("quiz")) { Music.setMuted(false); Music.play("quiz"); }
  else Music.setMuted(!Music.muted);
  renderSoundBanner();
  renderMuteButton();
}

function renderMuteButton() {
  const btn = $("muteBtn");
  btn.innerHTML = Music.muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
  btn.setAttribute("aria-pressed", String(Music.muted));
  btn.setAttribute("aria-label", Music.muted ? "Unmute music" : "Mute music");
}
function showMuteButton(visible) { $("muteBtn").hidden = !visible; }

/* ============================================================
   Scoring screen: 12 seconds of extremely serious mathematics
   ============================================================ */
const Scoring = (() => {
  const VARS = ["shade", "sass", "rosé", "tequila", "side_eye", "brunch", "drama", "voice_memo", "confessional",
    "group_chat", "pinot", "reunion", "spritz", "hot_take", "receipts", "clapback", "glam", "plus_one", "tablescape"];
  const STATUS = [
    "Loading your answers into the mainframe",
    "Cross-referencing 19 seasons of reunion footage",
    "Measuring side-eye at 240 frames per second",
    "Calculating the rosé-to-tequila ratio",
    "Running group-chat sentiment analysis",
    "Adjusting for confessional-interview bias",
    "Normalizing for brunch",
    "Consulting a panel of very serious producers",
    "Double-checking with legal",
  ];
  // [fraction of time, percent shown]: stalls make it feel like real work
  const CURVE = [[0, 0], [0.12, 17], [0.22, 24], [0.3, 25], [0.42, 51], [0.5, 53], [0.62, 78], [0.72, 86], [0.8, 97.2], [0.9, 99.1], [0.96, 99.9], [1, 100]];

  const rnd = (a, b, d = 3) => (a + Math.random() * (b - a)).toFixed(d);
  const int = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const any = (arr) => arr[(Math.random() * arr.length) | 0];
  const v = () => any(VARS);
  const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[int(0, 15)]).join("");
  const FORMULAS = [
    () => `Σ(${v()} × ${v()}) / √${v()} = ${rnd(0, 9)}`,
    () => `∂${v()}/∂t |t=${rnd(0, 8, 1)} → ${rnd(-2, 2, 4)}`,
    () => `∫₀^∞ ${v()}(x)·e^(−${v()}·x) dx = ${rnd(0, 40, 2)}`,
    () => `det[${v()}, ${v()}; ${v()}, ${v()}] = ${rnd(-99, 99, 2)}`,
    () => `P(${v()} | ${v()}) = ${rnd(0, 1, 4)}`,
    () => `λ_max(${v()}) = ${rnd(1, 3, 5)}`,
    () => `Q${int(1, 8)} ⊗ Q${int(1, 8)} → 0x${hex(6)}`,
    () => `FFT(${v()}) peak @ ${rnd(80, 900, 1)} Hz`,
    () => `lim n→∞ ${v()}(n) = ${any(["chaos", "∞", "a lawsuit", "another season", rnd(0, 1)])}`,
    () => `bootstrap n=${int(1000, 99999)} … CI[${rnd(0.1, 0.4)}, ${rnd(0.6, 0.99)}]`,
    () => `∇·${v()} = ${rnd(-5, 5)}   ✓ converged`,
    () => `χ²(${int(2, 9)}) = ${rnd(0, 30, 2)}   p < 0.0${int(1, 9)}`,
    () => `checksum ${hex(8)} … OK`,
    () => `e^(iπ) + ${v()} = ${v()} − 1`,
    () => `‖${v()} − ${v()}‖₂ = ${rnd(0, 12)}`,
  ];

  let timers = [], resolveRun = null;

  function line(text, kind = "") {
    const box = $("calcLines");
    box.append(h("span", { class: kind }, text));
    while (box.children.length > 40) box.firstChild.remove();
  }

  function percentAt(f) {
    for (let i = 1; i < CURVE.length; i++) {
      const [f1, p1] = CURVE[i], [f0, p0] = CURVE[i - 1];
      if (f <= f1) return p0 + ((f - f0) / (f1 - f0)) * (p1 - p0);
    }
    return 100;
  }

  function setStatus(text) {
    const el = $("calcStatus");
    el.textContent = text;
    el.classList.remove("is-swapping"); void el.offsetWidth; el.classList.add("is-swapping");
  }

  function setMeter(id, value) {
    $(id).style.width = `${value}%`;
    $(`${id}Val`).textContent = typeof value === "number" ? value.toFixed(1) : value;
  }

  function stop() {
    timers.forEach(clearInterval);
    timers = [];
    if (resolveRun) { resolveRun(); resolveRun = null; }
  }

  function run(ms) {
    stop();
    const start = performance.now();
    const slow = reduceMotion ? 6 : 1; // fewer updates for reduced motion
    $("calcLines").replaceChildren();
    const letters = state.answers.map((a) => String.fromCharCode(65 + a)).join(" ");
    line(`> init bravo-engine v4.2 … session ${hex(12)}`, "is-ok");
    line(`> answers = [ ${letters} ]`, "is-hot");

    let statusIndex = 0;
    setStatus(STATUS[0]);
    const statusEvery = (ms * 0.9) / STATUS.length;

    timers.push(setInterval(() => {
      const r = Math.random();
      line(FORMULAS[(Math.random() * FORMULAS.length) | 0](), r < 0.15 ? "is-ok" : r < 0.25 ? "is-hot" : "");
    }, 110 * slow));

    timers.push(setInterval(() => {
      setMeter("meterA", 15 + Math.random() * 80);
      setMeter("meterB", 15 + Math.random() * 80);
    }, 260 * slow));

    const bar = $("calcProgress");
    timers.push(setInterval(() => {
      const f = Math.min(1, (performance.now() - start) / ms);
      const pct = percentAt(f);
      $("calcFill").style.width = `${pct}%`;
      bar.setAttribute("aria-valuenow", String(Math.round(pct)));
      const nextStatus = Math.min(STATUS.length - 1, Math.floor((f * ms) / statusEvery));
      if (nextStatus !== statusIndex) { statusIndex = nextStatus; setStatus(STATUS[statusIndex]); }
      $("calcPct").textContent = f >= 0.96 ? "100% — VERDICT LOCKED 🔒" : `${pct.toFixed(1)}% · confidence ${(90 + f * 9.97).toFixed(2)}%`;
      if (f >= 0.96 && statusIndex !== STATUS.length) {
        statusIndex = STATUS.length;
        setStatus("Verdict locked. Do not adjust your set.");
        timers.slice(0, 2).forEach(clearInterval); // freeze the math and meters
        setMeter("meterA", "SEALED"); setMeter("meterB", "SEALED");
        $("meterA").style.width = $("meterB").style.width = "100%";
        line("> RESULT SEALED ✓", "is-ok");
      }
    }, 100));

    return new Promise((resolve) => {
      resolveRun = resolve;
      timers.push(setTimeout(stop, ms));
    });
  }

  return { run, stop };
})();

/* ============================================================
   Wire up
   ============================================================ */
$("introDuo").replaceChildren(...duo(showCard).childNodes);
$("startBtn").addEventListener("click", () => {
  Music.unlock();
  if (!Music.isPlaying("quiz")) Music.play("quiz"); // may already be playing from the sound banner
  renderMuteButton();
  showMuteButton(!!MUSIC.quiz?.src);
  state.current = 0;
  renderQuestion();
  show("quiz");
});
$("backBtn").addEventListener("click", goBack);
$("nextBtn").addEventListener("click", () => advance());
$("revealCameosBtn").addEventListener("click", revealCameos);
$("verdictBackBtn").addEventListener("click", () => show("result"));
$("muteBtn").addEventListener("click", () => { Music.setMuted(!Music.muted); renderMuteButton(); renderSoundBanner(); });
if (MUSIC.quiz?.src) {
  $("soundBanner").hidden = false;
  $("soundBanner").addEventListener("click", toggleSoundFromBanner);
  renderSoundBanner();
}
