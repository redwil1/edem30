"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

type Segment = "all" | "driver" | "passenger";

type LogEntry = {
  id: number;
  title: string;
  body: string;
  url: string | null;
  segment: Segment;
  recipientsCount: number;
  createdAt: string;
};

const SEGMENT_LABELS: Record<Segment, string> = {
  all: "Все пользователи",
  driver: "Только водители",
  passenger: "Только пассажиры",
};

export default function AdminNewsletterPanel() {
  const [log, setLog] = useState<LogEntry[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const res = await fetch("/api/admin/newsletter", { cache: "no-store" });
    const data = await res.json();
    setLog(data.log ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!confirm(`Отправить push-уведомление сегменту «${SEGMENT_LABELS[segment]}»?`)) return;

    setError("");
    setSuccess("");
    setSending(true);

    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url: url || null, segment }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось отправить рассылку");
        return;
      }

      setSuccess(`Отправлено ${data.entry.recipientsCount} получателям`);
      setTitle("");
      setBody("");
      setUrl("");
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Рассылка отправляется как push-уведомление подписанным пользователям выбранного
        сегмента.
      </p>

      <form
        onSubmit={submit}
        className="bg-[#12121c] border border-white/5 rounded-2xl p-5 mb-6 space-y-3 max-w-xl"
      >
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Заголовок</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Скидка на такси в выходные"
            required
            maxLength={100}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Текст</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Расскажите пользователям о новости"
            required
            maxLength={500}
            rows={3}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Ссылка (необязательно)</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/taxi"
              className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Кому</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as Segment)}
              className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
            >
              {(Object.keys(SEGMENT_LABELS) as Segment[]).map((s) => (
                <option key={s} value={s}>
                  {SEGMENT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={sending}
          className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-60 transition flex items-center gap-2"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Отправить
        </button>
      </form>

      {!log ? (
        <div className="py-10 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {log.map((entry) => (
            <div
              key={entry.id}
              className="bg-[#12121c] border border-white/5 rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{entry.title}</div>
                <div className="text-xs text-gray-500 whitespace-nowrap">{entry.createdAt}</div>
              </div>

              <p className="text-sm text-gray-400 mt-1">{entry.body}</p>

              <div className="text-xs text-gray-500 mt-2">
                {SEGMENT_LABELS[entry.segment]} · {entry.recipientsCount} получателей
              </div>
            </div>
          ))}

          {log.length === 0 && (
            <div className="text-center text-gray-500 py-10">Рассылок пока не было</div>
          )}
        </div>
      )}
    </div>
  );
}
