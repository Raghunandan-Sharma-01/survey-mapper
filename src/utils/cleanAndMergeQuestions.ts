import { ConvertedQuestion } from "../types/logic";

/**
 * Cleans up Mammoth's squashed text, merges duplicate IDs, rescues missing options, and cleans question text.
 */
export function cleanAndMergeQuestions(rawQuestions: ConvertedQuestion[]): ConvertedQuestion[] {
  const mergedQuestions = mergeDuplicateQuestions(rawQuestions);
  const instructionsToStrip = getInstructionsToStrip();

  for (const q of mergedQuestions) {
    cleanSquashedLogic(q);
    stripInstructionsFromText(q, instructionsToStrip);
    stripInstructionsFromOptions(q, instructionsToStrip);
    removeBlankAndDuplicateOptions(q);
  }

  return mergedQuestions;
}

function mergeDuplicateQuestions(rawQuestions: ConvertedQuestion[]): ConvertedQuestion[] {
  const mergedMap = new Map<string, ConvertedQuestion>();

  for (const q of rawQuestions) {
    if (!mergedMap.has(q.id)) {
      mergedMap.set(q.id, { ...q, options: [...q.options] });
    } else {
      const existing = mergedMap.get(q.id)!;
      if (existing.name === existing.id && q.name !== q.id) {
        existing.name = q.name;
      }
      if (q.options.length > 0) {
        existing.options = [...existing.options, ...q.options];
      }
      if (!existing.showLogic.text && q.showLogic.text) existing.showLogic.text = q.showLogic.text;
      if (!existing.terminateLogic.text && q.terminateLogic.text) existing.terminateLogic.text = q.terminateLogic.text;
    }
  }

  return Array.from(mergedMap.values());
}

function getInstructionsToStrip(): RegExp[] {
  return [
    /Select one response\.?/gi,
    /Select all that apply for each\.?/gi,
    /Select all that apply\.?/gi,
    /Select max \d+ options\.?/gi,
    /Select any \d+ options or less\.?/gi,
    /Enter your response in the box\.?/gi,
    /Enter a numeric response\.?/gi,
    /DEFAULT ORDER\.?/gi,
    /RANDOMIZE LIST\.?/gi,
    /COLS:[^\n]*/gi,
    /ROWS:[^\n]*/gi,
    /MIN:\s*\d*\.?/gi,          // Matches "MIN:" or "MIN: 5."
    /MAX:\s*\d*\.?/gi,          // Matches "MAX:" or "MAX: 30."
    /INTEGER NUMERIC RESPONSES\.?/gi,
    /EXCLUSIVE\.?/gi,           // Strips EXCLUSIVE metadata
    /ANCHOR\.?/gi,              // Strips ANCHOR metadata
    /ALWAYS SHOWN\.?/gi
  ];
}

function cleanSquashedLogic(q: ConvertedQuestion) {
  const squashedText = q.showLogic.text || q.terminateLogic.text || "";

  if (squashedText.length > 50 && squashedText.includes(q.id)) {
    if (squashedText.toLowerCase().includes("show")) {
      const showRegex = new RegExp(`(Show.*?)(?=-\\s*Terminate|${q.id}\\.)`, "i");
      const showMatch = squashedText.match(showRegex);
      q.showLogic.text = showMatch ? showMatch[1].replace(/^-\s*/, "").trim() : null;
    } else {
      q.showLogic.text = null;
    }

    if (squashedText.toLowerCase().includes("terminate")) {
      const termRegex = new RegExp(`(Terminate.*?)(?=${q.id}\\.|$)`, "i");
      const termMatch = squashedText.match(termRegex);
      if (termMatch) {
        let tText = termMatch[1].replace(/^-\s*/, "").trim();
        if (squashedText.includes(tText + q.id)) tText += " " + q.id;
        q.terminateLogic.text = tText;
      } else {
        q.terminateLogic.text = null;
      }
    } else {
      q.terminateLogic.text = null;
    }

    // Rescue Options missing from the table due to squashing
    const missingOptionRegex = /(\d+)\.([a-zA-Z][^0-9]+?)(?=\d+\.|$)/g;
    let match;
    while ((match = missingOptionRegex.exec(squashedText)) !== null) {
      const optId = match[1];
      let optText = match[2];

      if (!q.options.some((o) => o.id === optId)) {
        q.options.push({
          id: optId,
          text: optText,
          showLogic: { text: null, condition: null },
          terminateLogic: { text: null, condition: null },
        });
      }
    }
  }
}

function stripInstructionsFromText(q: ConvertedQuestion, instructionsToStrip: RegExp[]) {
  let cleanedText = q.text;
  instructionsToStrip.forEach(regex => {
    cleanedText = cleanedText.replace(regex, "");
  });
  q.text = cleanedText.trim();
}

function stripInstructionsFromOptions(q: ConvertedQuestion, instructionsToStrip: RegExp[]) {
  for (let i = 0; i < q.options.length; i++) {
    let optText = q.options[i].text;

    // If you want to use them later, you can map them dynamically like this:
    // if (/EXCLUSIVE/i.test(optText)) (q.options[i] as any).isExclusive = true;

    instructionsToStrip.forEach(regex => {
      optText = optText.replace(regex, "");
    });
    q.options[i].text = optText.trim();
  }
}

function removeBlankAndDuplicateOptions(q: ConvertedQuestion) {
  q.options = q.options.filter((opt, index, self) =>
    opt.text !== "" && index === self.findIndex((t) => t.id === opt.id)
  );
}