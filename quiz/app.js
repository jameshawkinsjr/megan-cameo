import { PEOPLE, CAMEOS, QUESTIONS, RESULTS } from "./config.js";
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

const duo = (extraClass = "") => h("div", { class: `duo ${extraClass}` },
  portrait("kyle"),
  h("span", { class: "duo__vs", "aria-hidden": "true" }, "vs"),
  portrait("bethenny"));

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
  show("tally");
  await wait(reduceMotion ? 600 : 2400);
  if (run !== state.run) return;
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
    ? h("div", { class: "result__stage result__stage--duo" }, duo())
    : h("div", { class: `result__stage is-${s.result}`, style: { "--halo": "var(--accent-glow)" } }, portrait(s.result));

  const kyleSeg = h("span", { class: "split__seg split__seg--kyle" });
  const bethSeg = h("span", { class: "split__seg split__seg--bethenny" });

  const reveal = h("div", { class: "reveal" },
    h("p", { class: "eyebrow" }, "The results are in"),
    stage,
    h("h2", { id: "resultTitle", class: `display result__title ${isHybrid ? "" : `is-${s.result}`}`, tabindex: "-1" },
      h("span", { class: "line line--small" }, r.headline),
      h("span", { class: "line line--name", style: { "--name-color": isHybrid ? "var(--champagne)" : "var(--accent)" } }, r.name)),
    h("p", { class: "result__subtitle" }, r.subtitle),
    h("section", { class: "scorecard", "aria-labelledby": "tallyHeading" },
      h("h3", { class: "eyebrow", id: "tallyHeading" }, "The official tally"),
      h("div", {
        class: "split", role: "img",
        "aria-label": `Kyle ${s.kyleScore} of ${s.total}, ${formatPercent(s.kylePercentage)}. Bethenny ${s.bethennyScore} of ${s.total}, ${formatPercent(s.bethennyPercentage)}.`,
      }, kyleSeg, bethSeg),
      h("dl", { class: "tally" },
        h("div", { class: "is-kyle" }, h("dt", {}, "Kyle"), h("dd", {}, kyleLabel)),
        h("div", { class: "is-bethenny" }, h("dt", {}, "Bethenny"), h("dd", {}, bethLabel)))),
    h("p", { class: "result__desc" }, r.description),
    h("ul", { class: "traits", "aria-label": "Your personality traits" }, r.traits.map((t) => h("li", {}, t))),
    h("p", { class: "diagnosis" }, "Your official diagnosis: ", h("strong", {}, r.diagnosis)));

  const teaser = h("div", { class: "teaser" },
    h("p", { class: "eyebrow" }, "Your verdict is in"),
    h("h2", {}, "Hear it from the professionals."),
    h("p", {}, "Your Bravo alter ego has been identified. But we thought you deserved a second opinion."),
    h("button", { class: "btn btn--primary", type: "button", id: "revealCameosBtn", onclick: revealCameos }, "Reveal your Cameo surprises"));

  $("result").replaceChildren(reveal, teaser,
    h("button", { class: "link-btn", type: "button", onclick: restart }, "Retake the quiz"));

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

  $("cameos").replaceChildren(
    h("header", { class: "cameos__head" },
      h("p", { class: "eyebrow" }, "The grand finale"),
      h("h2", { id: "cameosTitle", tabindex: "-1" }, "A word from the professionals")),
    h("div", { class: "cameo-grid" }, order.map((key) => cameoCard(key, key === result))),
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
  const media = h("div", { class: "cameo__media" });
  mountMedia(media, key);
  return h("article", { class: `cameo is-${key} ${featured ? "cameo--featured" : ""}`, "aria-labelledby": `cameo-${key}-name` },
    featured ? h("p", { class: "cameo__badge" }, "YOUR ALTER EGO") : null,
    h("header", { class: "cameo__head" },
      portrait(key, { caption: false }),
      h("div", {},
        h("p", { class: "cameo__label" }, c.label || ""),
        h("h3", { class: "cameo__name", id: `cameo-${key}-name` }, p.name),
        h("p", { class: "cameo__show" }, p.show))),
    media);
}

const safeUrl = (url) => {
  try {
    const u = new URL(url, location.href);
    return /^https?:$/.test(u.protocol) ? u.href : null;
  } catch { return null; }
};

function mountMedia(box, key) {
  const p = PEOPLE[key];
  const c = CAMEOS[key] || {};
  if (c.videoSrc) {
    const video = h("video", {
      controls: true, playsinline: true, "webkit-playsinline": true, preload: "metadata",
      "aria-label": `Cameo video from ${p.name}`, poster: c.poster || null,
    });
    video.addEventListener("error", () => box.replaceChildren(placeholder(key, { failed: true })), { once: true });
    video.addEventListener("play", () => pauseVideos(video));
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
   Wire up
   ============================================================ */
$("introDuo").replaceChildren(...duo().childNodes);
$("startBtn").addEventListener("click", () => {
  state.current = 0;
  renderQuestion();
  show("quiz");
});
$("backBtn").addEventListener("click", goBack);
$("nextBtn").addEventListener("click", () => advance());
