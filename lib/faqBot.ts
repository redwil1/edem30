import "server-only";

import { faqSections } from "@/data/faqContent";

const STOPWORDS = new Set([
  "как", "что", "где", "когда", "почему", "зачем", "это", "мне", "мой",
  "моя", "моё", "мои", "вы", "ты", "я", "и", "а", "но", "или", "не",
  "на", "по", "из", "за", "от", "до", "для", "с", "со", "у", "о", "об",
  "если", "то", "же", "ли", "бы", "все", "всё", "есть", "быть", "можно",
  "нужно", "надо", "здравствуйте", "привет", "подскажите", "пожалуйста",
]);

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }

    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

/**
 * Насколько близко слово запроса совпадает со словом из базы: 1 — точное
 * совпадение, меньше — тем ближе (опечатки, окончания слов), 0 — не похоже.
 */
function wordSimilarity(query: string, keyword: string): number {
  if (query === keyword) return 1;

  const minLen = Math.min(query.length, keyword.length);
  const maxLen = Math.max(query.length, keyword.length);

  // Общая основа слова (стемминг для русских окончаний): "поездк" в
  // "поездка"/"поездку"/"поездок".
  if (minLen >= 4 && (query.startsWith(keyword.slice(0, minLen - 1)) || keyword.startsWith(query.slice(0, minLen - 1)))) {
    return 0.85;
  }

  const distance = levenshtein(query, keyword);
  const tolerance = maxLen <= 5 ? 1 : maxLen <= 9 ? 2 : 3;

  if (distance <= tolerance) {
    return Math.max(0.5, 1 - distance / maxLen);
  }

  return 0;
}

type FaqEntry = {
  question: string;
  answer: string;
  keywords: string[];
  questionKeywords: string[];
};

const INDEX: FaqEntry[] = faqSections.flatMap((section) =>
  section.items.map((item) => {
    const answer = item.answer.join(" ");
    return {
      question: item.question,
      answer,
      keywords: normalize(`${item.question} ${answer}`),
      questionKeywords: normalize(item.question),
    };
  })
);

export type FaqAnswer = {
  matched: boolean;
  text: string;
  question?: string;
};

const FALLBACK =
  "Не нашёл точного ответа на этот вопрос в базе знаний сайта. Напишите нам на support@edem30.ru или в Telegram @edem30bot — там подскажут подробнее.";

const MATCH_THRESHOLD = 0.8;

export function answerFaqQuestion(userQuestion: string): FaqAnswer {
  const queryWords = normalize(userQuestion);

  if (queryWords.length === 0) {
    return { matched: false, text: FALLBACK };
  }

  let best: FaqEntry | null = null;
  let bestScore = 0;

  for (const entry of INDEX) {
    let score = 0;

    for (const word of queryWords) {
      let wordBest = 0;

      for (const kw of entry.keywords) {
        wordBest = Math.max(wordBest, wordSimilarity(word, kw));
      }

      score += wordBest;

      for (const kw of entry.questionKeywords) {
        score += wordSimilarity(word, kw) * 0.5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < MATCH_THRESHOLD) {
    return { matched: false, text: FALLBACK };
  }

  return { matched: true, text: best.answer, question: best.question };
}
