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
    .replace(/[^а-яёa-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

type FaqEntry = {
  question: string;
  answer: string;
  keywords: string[];
};

const INDEX: FaqEntry[] = faqSections.flatMap((section) =>
  section.items.map((item) => {
    const answer = item.answer.join(" ");
    return {
      question: item.question,
      answer,
      keywords: normalize(`${item.question} ${answer}`),
    };
  })
);

export type FaqAnswer = {
  matched: boolean;
  text: string;
  question?: string;
};

const FALLBACK =
  "Не нашёл точного ответа на этот вопрос в базе знаний сайта. Напишите нам на support@edem30.ru или в Telegram @edem30_support — там подскажут подробнее.";

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
      if (entry.keywords.includes(word)) score += 1;
      if (normalize(entry.question).includes(word)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore === 0) {
    return { matched: false, text: FALLBACK };
  }

  return { matched: true, text: best.answer, question: best.question };
}
