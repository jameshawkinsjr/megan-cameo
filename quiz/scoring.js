/* Pure scoring logic: no DOM, so it can be unit-tested in Node. */

export const PERSONAS = ["kyle", "bethenny"];

/**
 * @param {Array<{options: Array<{persona: string}>}>} questions
 * @param {Array<number|null>} answers  chosen option index per question (null = unanswered)
 */
export function scoreQuiz(questions, answers) {
  const total = questions.length;
  let kyleScore = 0;
  let bethennyScore = 0;
  let answered = 0;

  questions.forEach((q, i) => {
    const choice = answers[i];
    if (choice === null || choice === undefined) return;
    const option = q.options[choice];
    if (!option) throw new Error(`Question ${i + 1} has no option ${choice}`);
    answered++;
    if (option.persona === "kyle") kyleScore++;
    else if (option.persona === "bethenny") bethennyScore++;
    else throw new Error(`Unknown persona "${option.persona}" on question ${i + 1}`);
  });

  const complete = answered === total;
  let result = null;
  if (complete) {
    if (kyleScore > bethennyScore) result = "kyle";
    else if (bethennyScore > kyleScore) result = "bethenny";
    else result = "hybrid"; // a tie is a tie: no forced winner
  }

  return {
    total,
    answered,
    complete,
    kyleScore,
    bethennyScore,
    kylePercentage: total ? (kyleScore / total) * 100 : 0,
    bethennyPercentage: total ? (bethennyScore / total) * 100 : 0,
    result,
  };
}

/** 75 -> "75%", 62.5 -> "62.5%" (exact for eighths, so the two always add to 100). */
export function formatPercent(value) {
  return `${Math.round(value * 10) / 10}%`;
}
