"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, Loader2, Paperclip, Send } from "lucide-react";

import Avatar from "@/components/trip/Avatar";
import { compressImage, ImageCompressError } from "@/lib/imageCompress";
import { formatChatDateSeparator, formatPrice, isOnline } from "@/lib/utils";

type Message = {
  id: number;
  text: string;
  attachmentUrl: string | null;
  attachmentType: "image" | "video" | null;
  createdAt: string;
  isYou: boolean;
  senderName: string;
  read: boolean;
};

type OtherParticipant = {
  id: number;
  name: string;
  avatarUrl: string | null;
  avatarPreset: string | null;
  lastSeenAt: string | null;
};

type ListingContext = {
  id: number;
  title: string;
  price: number | null;
  priceType: "fixed" | "negotiable" | "free";
  status: "active" | "reserved" | "sold" | "archived";
  photoUrl: string | null;
};

const LISTING_STATUS_LABELS: Record<ListingContext["status"], string> = {
  active: "Активно",
  reserved: "Забронировано",
  sold: "Продано",
  archived: "Снято с публикации",
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
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function Attachment({ url, type }: { url: string; type: "image" | "video" }) {
  if (type === "video") {
    return <video src={url} controls className="max-w-full rounded-xl mb-1.5 max-h-[280px]" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Вложение" className="max-w-full rounded-xl mb-1.5 max-h-[280px] object-cover" />
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

export default function DirectChatCard({ conversationId }: { conversationId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<OtherParticipant | null>(null);
  const [listing, setListing] = useState<ListingContext | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data) {
      setMessages(data.messages ?? []);
      setOther(data.otherParticipant ?? null);
      setListing(data.listing ?? null);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 6_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

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

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
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

      const signRes = await fetch(`/api/conversations/${conversationId}/messages/attachment-url`, {
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

      const msgRes = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentPath: signData.path, attachmentType: signData.attachmentType }),
      });
      const msgData = await msgRes.json().catch(() => null);

      if (!msgRes.ok) {
        setError(msgData?.error || "Не удалось отправить вложение");
        return;
      }

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
    <div className="bg-[#12121c] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[70vh] min-h-[420px]">
      <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-white/5 shrink-0">
        {other ? (
          <>
            <Avatar
              name={other.name}
              size={36}
              avatarUrl={other.avatarUrl}
              avatarPreset={other.avatarPreset}
              online={isOnline(other.lastSeenAt)}
            />
            <div>
              <div className="font-display font-bold">{other.name}</div>
              <div className="text-xs text-gray-500">
                {isOnline(other.lastSeenAt) ? "В сети" : "Не в сети"}
              </div>
            </div>
          </>
        ) : (
          <div className="font-display font-bold">Чат</div>
        )}
      </div>

      {listing && (
        <Link
          href={`/marketplace/${listing.id}`}
          className="flex items-center gap-3 p-3 sm:p-4 border-b border-white/5 shrink-0 hover:bg-white/5 transition"
        >
          <div className="w-11 h-11 rounded-xl bg-[#1c1c2b] shrink-0 overflow-hidden flex items-center justify-center">
            {listing.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">📦</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{listing.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {listing.priceType === "free" ? (
                <span className="text-green-400 font-medium">Бесплатно</span>
              ) : (
                <span className="text-violet-400 font-medium">{formatPrice(listing.price ?? 0)}</span>
              )}
              {listing.status !== "active" && ` · ${LISTING_STATUS_LABELS[listing.status]}`}
            </div>
          </div>

          <span className="text-xs text-violet-400 shrink-0">Открыть →</span>
        </Link>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1">
        {!loaded ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center px-6">
            Сообщений пока нет. Напишите первым.
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

                <div className={`flex mb-3 ${group.senderIsYou ? "justify-end" : "justify-start"}`}>
                  <div className="flex flex-col gap-1 max-w-[78%]">
                    {group.messages.map((m, mi) => {
                      const isLast = mi === group.messages.length - 1;
                      return (
                        <div key={m.id} className={`flex flex-col ${group.senderIsYou ? "items-end" : "items-start"}`}>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm break-words ${
                              group.senderIsYou ? "bubble-gradient rounded-tr-sm" : "bg-[#1c1c2b] rounded-tl-sm"
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
            placeholder="Написать сообщение..."
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
      </div>
    </div>
  );
}
