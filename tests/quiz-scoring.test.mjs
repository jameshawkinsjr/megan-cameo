// Run from the repo root with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS, RESULTS, PEOPLE, CAMEOS } from "../quiz/config.js";
import { scoreQuiz, formatPercent } from "../quiz/scoring.js";

// Answer every question with the option belonging to the persona chosen for that slot
const pick = (personas) => personas.map((p, i) => QUESTIONS[i].options.findIndex((o) => o.persona === p));
const K = "kyle", B = "bethenny";

test("config: 8 questions, each with exactly one Kyle and one Bethenny option", () => {
  assert.equal(QUESTIONS.length, 8);
  for (const q of QUESTIONS) {
    assert.deepEqual(q.options.map((o) => o.persona).sort(), [B, K]);
  }
  for (const key of ["kyle", "bethenny", "hybrid"]) assert.ok(RESULTS[key]);
  for (const key of [K, B]) { assert.ok(PEOPLE[key]); assert.ok(CAMEOS[key]); }
});

test("8 Kyle answers -> Kyle, 8-0", () => {
  const s = scoreQuiz(QUESTIONS, pick(Array(8).fill(K)));
  assert.equal(s.result, "kyle");
  assert.equal(s.kyleScore, 8); assert.equal(s.bethennyScore, 0);
  assert.equal(s.kylePercentage, 100); assert.equal(s.bethennyPercentage, 0);
});

test("8 Bethenny answers -> Bethenny, 0-8", () => {
  const s = scoreQuiz(QUESTIONS, pick(Array(8).fill(B)));
  assert.equal(s.result, "bethenny");
  assert.equal(s.kyleScore, 0); assert.equal(s.bethennyScore, 8);
});

test("4-4 split -> Bravo Hybrid", () => {
  const s = scoreQuiz(QUESTIONS, pick([K, B, K, B, K, B, K, B]));
  assert.equal(s.result, "hybrid");
  assert.equal(s.kylePercentage, 50); assert.equal(s.bethennyPercentage, 50);
});

test("5-3 splits pick the right winner", () => {
  const k = scoreQuiz(QUESTIONS, pick([K, K, K, K, K, B, B, B]));
  assert.equal(k.result, "kyle"); assert.equal(k.kyleScore, 5);
  assert.equal(formatPercent(k.kylePercentage), "62.5%"); assert.equal(formatPercent(k.bethennyPercentage), "37.5%");
  const b = scoreQuiz(QUESTIONS, pick([B, K, B, K, B, K, B, B]));
  assert.equal(b.result, "bethenny"); assert.equal(b.bethennyScore, 5);
});

test("changing an answer changes the result", () => {
  const answers = pick([K, K, K, K, B, B, B, B]);
  assert.equal(scoreQuiz(QUESTIONS, answers).result, "hybrid");
  answers[0] = QUESTIONS[0].options.findIndex((o) => o.persona === B);
  const s = scoreQuiz(QUESTIONS, answers);
  assert.equal(s.result, "bethenny"); assert.equal(s.bethennyScore, 5);
});

test("scores always total 8 and percentages total 100", () => {
  for (let mask = 0; mask < 256; mask++) {
    const personas = Array.from({ length: 8 }, (_, i) => (mask >> i) & 1 ? K : B);
    const s = scoreQuiz(QUESTIONS, pick(personas));
    assert.equal(s.kyleScore + s.bethennyScore, 8);
    assert.equal(s.kylePercentage + s.bethennyPercentage, 100);
    assert.equal(s.result, s.kyleScore >= 5 ? "kyle" : s.bethennyScore >= 5 ? "bethenny" : "hybrid");
  }
});

test("incomplete quiz has no result", () => {
  const answers = pick(Array(8).fill(K));
  answers[7] = null;
  const s = scoreQuiz(QUESTIONS, answers);
  assert.equal(s.complete, false); assert.equal(s.result, null); assert.equal(s.answered, 7);
});
