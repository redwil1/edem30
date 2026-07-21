import "server-only";

const PHONE_RE = /(\+?\d[\d\-\s()]{7,}\d)/;

const LINK_RE =
  /(https?:\/\/|www\.|\bt\.me\b|\bwa\.me\b|\bvk\.com\b|whatsapp|telegram|viber|@\w{3,}|\.(ru|com|me|io|org|net)\b)/i;

const PREPAY_RE =
  /(перевед|переведи|предоплат|по ссылк|на карту|скинь|qiwi|киви|сбп|sbp)/i;

export type ModerationResult =
  | { blocked: false }
  | { blocked: true; reason: string };

export function checkChatMessage(text: string): ModerationResult {
  if (PHONE_RE.test(text)) {
    return {
      blocked: true,
      reason: "Нельзя делиться номером телефона в чате поездки",
    };
  }

  if (LINK_RE.test(text)) {
    return {
      blocked: true,
      reason: "Нельзя делиться ссылками или контактами вне сервиса",
    };
  }

  if (PREPAY_RE.test(text)) {
    return {
      blocked: true,
      reason: "Нельзя договариваться о переводе оплаты вперёд вне поездки",
    };
  }

  return { blocked: false };
}
