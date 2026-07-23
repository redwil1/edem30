import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { faqText } from "@/data/faqContent";

const apiKey = process.env.ANTHROPIC_API_KEY;

const client = apiKey ? new Anthropic({ apiKey }) : null;

export function isSupportBotConfigured(): boolean {
  return client !== null;
}

const SYSTEM_PROMPT = `Ты — бот поддержки сайта «Едем30» (edem30.ru), сервиса поиска попутчиков и заказа такси по Астраханской области.

Отвечай только на вопросы о работе сервиса, коротко и по-русски, опираясь на раздел вопросов-ответов ниже. Если ответа там нет — честно скажи, что не знаешь, и предложи написать в поддержку (support@edem30.ru или Telegram @edem30_support).

Никогда не выдумывай функции, которых нет на сайте. Не обсуждай темы, не связанные с сервисом. Не проси и не подтверждай личные данные, пароли, номера карт.

# База знаний (вопросы и ответы с сайта)

${faqText}`;

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export async function askSupportBot(history: ChatMessage[]): Promise<string> {
  if (!client) {
    throw new Error("SUPPORT_BOT_NOT_CONFIGURED");
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: history.map((m) => ({
      role: m.role,
      content: m.text,
    })),
  });

  const textBlock = response.content.find((block) => block.type === "text");

  return textBlock && "text" in textBlock
    ? textBlock.text
    : "Не удалось получить ответ, попробуйте переформулировать вопрос.";
}
