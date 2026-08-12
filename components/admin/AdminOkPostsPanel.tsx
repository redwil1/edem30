"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Send } from "lucide-react";

import { popularDirections } from "@/data/popularDirections";

type Post = {
  id: number;
  content: string;
  status: "draft" | "published" | "failed";
  error: string | null;
  createdAt: string;
  publishedAt: string | null;
};

const MARKETING_TEMPLATES = [
  {
    label: "Первый сервис попутчиков региона 30",
    text: "Хватит писать в 10 чатов ВК, чтобы найти попутчика 🚗\n\nЕдем30 — первый сервис попутчиков Астраханской области. Расписание, отзывы о водителях, чат прямо в поездке.\n\nedem30.ru",
  },
  {
    label: "Бонус водителям 50₽",
    text: "Водители! Разместите поездку на Едем30 и получайте +50₽ за каждого пассажира 🎁\n\nПросто, быстро, без комиссии за размещение.\n\nedem30.ru",
  },
  {
    label: "Не нашли машину — оставьте заявку",
    text: "Не нашли попутную машину? На Едем30 можно оставить заявку на маршрут — водители видят, что вам нужна поездка, и откликаются 👀\n\nedem30.ru",
  },
];

function directionPostText(from: string, to: string, price: number) {
  return `Ищете попутчиков ${from} → ${to}? 🚌\n\nАктуальное расписание и цены от ${price}₽ — на Едем30. Забронируйте место или разместите свою поездку.\n\nedem30.ru`;
}

const STATUS_LABELS: Record<Post["status"], string> = {
  draft: "Черновик",
  published: "Опубликовано",
  failed: "Ошибка",
};

const STATUS_COLORS: Record<Post["status"], string> = {
  draft: "text-gray-400 bg-white/5",
  published: "text-green-400 bg-green-500/10",
  failed: "text-red-400 bg-red-500/10",
};

export default function AdminOkPostsPanel() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/ok-posts", { cache: "no-store" });
    const data = await res.json();
    setPosts(data.posts ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function copyText() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function publish() {
    if (!content.trim()) return;
    if (!confirm("Опубликовать этот пост в группу «Харабалинский интернет базарчик»?")) return;

    setPublishing(true);
    setError("");

    try {
      const res = await fetch("/api/admin/ok-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось опубликовать");
        return;
      }

      if (data.post.status === "failed") {
        setError(data.post.error || "OK.ru отклонил публикацию");
      } else {
        setContent("");
      }

      await load();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Публикация идёт в группу{" "}
        <a
          href="https://ok.ru/kharabalibazar"
          target="_blank"
          rel="noreferrer"
          className="text-violet-400 hover:text-violet-300"
        >
          «Харабали базарчик»
        </a>
        . Пока не настроен OK_ACCESS_TOKEN — публикация будет падать с ошибкой, но текст
        всегда можно скопировать и выложить вручную.
      </p>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-5 mb-6 max-w-2xl space-y-4">
        <div>
          <div className="text-xs text-gray-500 mb-2">Готовые шаблоны</div>

          <div className="flex flex-wrap gap-2">
            {MARKETING_TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setContent(t.text)}
                className="text-xs bg-[#171726] border border-white/10 hover:border-violet-500/40 rounded-full px-3.5 py-2 transition"
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {popularDirections.map((d) => (
              <button
                key={d.slug}
                type="button"
                onClick={() => setContent(directionPostText(d.from, d.to, d.price))}
                className="text-xs bg-[#171726] border border-amber-500/20 hover:border-amber-500/40 text-amber-300 rounded-full px-3.5 py-2 transition"
              >
                {d.from} → {d.to}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Текст поста</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Выберите шаблон выше или напишите свой текст"
            rows={6}
            maxLength={4000}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={publish}
            disabled={publishing || !content.trim()}
            className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-60 transition flex items-center gap-2"
          >
            {publishing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Опубликовать в ОК
          </button>

          <button
            type="button"
            onClick={copyText}
            disabled={!content.trim()}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-40 transition"
          >
            <Copy size={15} />
            {copied ? "Скопировано" : "Скопировать текст"}
          </button>
        </div>
      </div>

      {!posts ? (
        <div className="py-10 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[p.status]}`}
                >
                  {STATUS_LABELS[p.status]}
                </span>

                <div className="text-xs text-gray-500 whitespace-nowrap">{p.createdAt}</div>
              </div>

              <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{p.content}</p>

              {p.error && <p className="text-xs text-red-400 mt-2">{p.error}</p>}
            </div>
          ))}

          {posts.length === 0 && (
            <div className="text-center text-gray-500 py-10">Постов пока не было</div>
          )}
        </div>
      )}
    </div>
  );
}
