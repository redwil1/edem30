"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Headset, Loader2, Paperclip, Send } from "lucide-react";

import Avatar from "@/components/trip/Avatar";
import { compressImage, ImageCompressError } from "@/lib/imageCompress";
import { formatChatDateSeparator } from "@/lib/utils";

type Message = {
  id: number;
  text: string;
  attachmentUrl: string | null;
  attachmentType: "image" | "video" | null;
  createdAt: string;
  isYou: boolean;
  isStaff: boolean;
  read: boolean;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Attachment({ url, type }: { url: string; type: "image" | "video" }) {
  if (type === "video") {
    return (
      <video src={url} controls className="max-w-full rounded-xl mb-1.5 max-h-[280px]" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Вложение"
      className="max-w-full rounded-xl mb-1.5 max-h-[280px] object-cover"
    />
  );
}

type Group = { senderIsYou: boolean; messages: Message[] };

function groupMessages(messages: Message[]): Group[] {
  const groups: Group[] = [];

  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderIsYou === m.isYou) {
      last.messages.push(m);
    } else {
      groups.push({ senderIsYou: m.isYou, messages: [m] });
    }
  }

  return groups;
}

export default function SupportChatCard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationExists, setConversationExists] = useState(false);
  const [staffOnline, setStaffOnline] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/support/messages", { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (data) {
      setMessages(data.messages ?? []);
      setConversationExists(!!data.conversationExists);
      setStaffOnline(!!data.staffOnline);
    }

    setLoaded(true);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 6_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  async function send() {
    const text = value.trim();

    if (!text || sending) return;

    setSending(true);
    setError("");

    const res = await fetch("/api/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json().catch(() => null);

    setSending(false);

    if (!res.ok) {
      setError(data?.error || "Не удалось отправить сообщение");
      return;
    }

    setValue("");
    setConversationExists(true);
    setMessages((prev) => [...prev, data]);
  }

  async function uploadAttachment(rawFile: File) {
    setError("");

    const isVideo = rawFile.type.startsWith("video/");
    const isImage = rawFile.type.startsWith("image/");

    if (!isVideo && !isImage) {
      setError("Поддерживаются только фото и видео");
      return;
    }

    if (isVideo && !ALLOWED_ATTACHMENT_TYPES.includes(rawFile.type)) {
      setError("Поддерживаются видео форматов MP4/WEBM/MOV");
      return;
    }

    setUploading(true);

    try {
      const file = isImage ? await compressImage(rawFile, 1600, 0.82) : rawFile;
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

      if (file.size > maxSize) {
        setError(isVideo ? "Видео слишком большое (максимум 50МБ)" : "Фото слишком большое даже после сжатия");
        return;
      }

      const signRes = await fetch("/api/support/messages/attachment-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });

      const signData = await signRes.json().catch(() => null);

      if (!signRes.ok) {
        setError(signData?.error || "Не удалось подготовить загрузку");
        return;
      }

      const putRes = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        setError("Не удалось загрузить файл");
        return;
      }

      const msgRes = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachmentPath: signData.path,
          attachmentType: signData.attachmentType,
        }),
      });

      const msgData = await msgRes.json().catch(() => null);

      if (!msgRes.ok) {
        setError(msgData?.error || "Не удалось отправить вложение");
        return;
      }

      setConversationExists(true);
      setMessages((prev) => [...prev, msgData]);
    } catch (err) {
      setError(err instanceof ImageCompressError ? err.message : "Не удалось подключиться к серверу");
    } finally {
      setUploading(false);
    }
  }

  const groups = groupMessages(messages);
  let lastDateLabel: string | null = null;

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-white/5 shrink-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center">
            <Headset size={18} className="text-violet-400" />
          </div>
          {staffOnline && (
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400"
              style={{ border: "2px solid var(--bg-card, #12121c)" }}
            />
          )}
        </div>

        <div>
          <div className="font-display font-bold">Поддержка Едем30</div>
          <div className="text-xs text-gray-500">
            {staffOnline ? "В сети" : "Обычно отвечаем в течение дня"}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1 min-h-[360px] max-h-[520px]">
        {!loaded ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !conversationExists ? (
          <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-gray-500 text-center px-6">
            Пока нет сообщений от поддержки. Если администратор напишет вам, диалог
            появится здесь и вы сможете ответить.
          </div>
        ) : (
          groups.map((group, gi) => {
            const groupFirst = group.messages[0];
            const showDate = formatChatDateSeparator(groupFirst.createdAt) !== lastDateLabel;
            if (showDate) lastDateLabel = formatChatDateSeparator(groupFirst.createdAt);

            return (
              <div key={gi}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] text-gray-500 bg-white/5 rounded-full px-3 py-1">
                      {formatChatDateSeparator(groupFirst.createdAt)}
                    </span>
                  </div>
                )}

                <div className={`flex gap-2.5 mb-3 ${group.senderIsYou ? "justify-end" : "justify-start"}`}>
                  {!group.senderIsYou && (
                    <div className="w-7 shrink-0 flex items-end">
                      <Avatar name="Поддержка" size={28} />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 max-w-[78%]">
                    {group.messages.map((m, mi) => {
                      const isLast = mi === group.messages.length - 1;

                      return (
                        <div key={m.id} className={`flex flex-col ${group.senderIsYou ? "items-end" : "items-start"}`}>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm break-words ${
                              group.senderIsYou
                                ? "bubble-gradient rounded-tr-sm"
                                : "bg-[#1c1c2b] rounded-tl-sm"
                            }`}
                          >
                            {m.attachmentUrl && m.attachmentType && (
                              <Attachment url={m.attachmentUrl} type={m.attachmentType} />
                            )}
                            {m.text}
                          </div>

                          {isLast && (
                            <div
                              className={`flex items-center gap-1 text-[11px] text-gray-500 mt-1 ${
                                group.senderIsYou ? "flex-row-reverse" : ""
                              }`}
                            >
                              {formatTime(m.createdAt)}
                              {group.senderIsYou &&
                                (m.read ? (
                                  <CheckCheck size={12} className="text-violet-400" />
                                ) : (
                                  <Check size={12} />
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-white/5 shrink-0">
        {!conversationExists && loaded ? (
          <p className="text-xs text-gray-500 text-center">
            Написать первым можно после того, как поддержка ответит вам
          </p>
        ) : (
          <>
            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

            <div className="flex items-end gap-2 bg-[#1c1c2b] rounded-2xl px-3 py-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-gray-500 hover:text-gray-300 transition p-1.5 disabled:opacity-60 shrink-0"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAttachment(file);
                  e.target.value = "";
                }}
              />

              <textarea
                ref={textareaRef}
                rows={1}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ответить поддержке..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500 resize-none py-1.5 max-h-[120px]"
              />

              <button
                onClick={send}
                disabled={sending || !value.trim()}
                className="btn-gradient transition w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
