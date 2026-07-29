"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Loader2, Paperclip, Search, Send, X } from "lucide-react";

import Avatar from "@/components/trip/Avatar";
import { compressImage, ImageCompressError } from "@/lib/imageCompress";
import { formatChatDateSeparator } from "@/lib/utils";

type ConversationSummary = {
  userId: number;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  avatarPreset: string | null;
  online: boolean;
  lastMessageAt: string;
  lastMessageText: string | null;
  lastMessageAttachmentType: string | null;
  needsReply: boolean;
  unreadCount: number;
};

type SearchUser = {
  id: number;
  name: string;
  phone: string | null;
};

type Message = {
  id: number;
  text: string;
  attachmentUrl: string | null;
  attachmentType: "image" | "video" | null;
  createdAt: string;
  isStaff: boolean;
  senderName: string;
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
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function phoneLabel(phone: string | null) {
  return phone ? `+${phone}` : "без телефона";
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

type Group = { senderIsStaff: boolean; messages: Message[] };

function groupMessages(messages: Message[]): Group[] {
  const groups: Group[] = [];

  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderIsStaff === m.isStaff) {
      last.messages.push(m);
    } else {
      groups.push({ senderIsStaff: m.isStaff, messages: [m] });
    }
  }

  return groups;
}

export default function AdminSupportInbox() {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [selectedOnline, setSelectedOnline] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationExists, setConversationExists] = useState(false);
  const [threadLoaded, setThreadLoaded] = useState(false);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadConversations() {
    const res = await fetch("/api/admin/support", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setConversations(data?.conversations ?? []);
  }

  useEffect(() => {
    loadConversations();

    const interval = setInterval(loadConversations, 15_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/admin/support/search-users?q=${encodeURIComponent(query)}`);
      const data = await res.json().catch(() => null);
      setSearchResults(data?.users ?? []);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  async function openConversation(userId: number, name: string, online = false) {
    setSelectedUserId(userId);
    setSelectedName(name);
    setSelectedOnline(online);
    setQuery("");
    setSearchResults([]);
    setThreadLoaded(false);
    await loadMessages(userId);
  }

  async function loadMessages(userId: number) {
    const res = await fetch(`/api/admin/support/${userId}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setMessages(data?.messages ?? []);
    setConversationExists(!!data?.conversationExists);
    if (typeof data?.subjectOnline === "boolean") setSelectedOnline(data.subjectOnline);
    setThreadLoaded(true);
  }

  useEffect(() => {
    if (!selectedUserId) return;

    const interval = setInterval(() => loadMessages(selectedUserId), 5_000);

    return () => clearInterval(interval);
  }, [selectedUserId]);

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

    if (!text || !selectedUserId || sending) return;

    setSending(true);
    setError("");

    const res = await fetch(`/api/admin/support/${selectedUserId}`, {
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
    loadConversations();
  }

  async function uploadAttachment(rawFile: File) {
    if (!selectedUserId) return;

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

      const signRes = await fetch(`/api/admin/support/${selectedUserId}/attachment-url`, {
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

      const msgRes = await fetch(`/api/admin/support/${selectedUserId}`, {
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
      loadConversations();
    } catch (err) {
      setError(err instanceof ImageCompressError ? err.message : "Не удалось подключиться к серверу");
    } finally {
      setUploading(false);
    }
  }

  const groups = groupMessages(messages);
  let lastDateLabel: string | null = null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[560px]">
      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-3 flex flex-col">
        <div className="flex items-center gap-2 bg-[#1c1c2b] rounded-xl px-3 py-2 mb-3">
          <Search size={15} className="text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти пользователя, чтобы написать первым"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {query.trim() ? (
          <div className="space-y-1 overflow-y-auto flex-1">
            {searching && (
              <div className="flex items-center justify-center py-6 text-gray-500">
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}

            {!searching &&
              searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openConversation(u.id, u.name)}
                  className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl hover:bg-white/5 transition"
                >
                  <Avatar name={u.name} size={32} />
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-gray-500">{phoneLabel(u.phone)}</div>
                  </div>
                </button>
              ))}

            {!searching && searchResults.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">Никого не найдено</p>
            )}
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto flex-1">
            {conversations === null && (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}

            {conversations?.map((c) => (
              <button
                key={c.userId}
                onClick={() => openConversation(c.userId, c.name, c.online)}
                className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl transition ${
                  selectedUserId === c.userId ? "bg-violet-600/20" : "hover:bg-white/5"
                }`}
              >
                <Avatar name={c.name} size={32} avatarUrl={c.avatarUrl} avatarPreset={c.avatarPreset} online={c.online} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    {c.unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-violet-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {c.lastMessageText || (c.lastMessageAttachmentType ? "Вложение" : "Нет сообщений")}
                  </div>
                </div>
              </button>
            ))}

            {conversations?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                Пока нет диалогов. Найдите пользователя выше, чтобы написать первым.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500 text-center px-6">
            Выберите диалог слева или найдите пользователя, чтобы написать ему первым.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 p-4 sm:p-5 border-b border-white/5 shrink-0">
              <Avatar name={selectedName} size={32} online={selectedOnline} />
              <div>
                <div className="font-medium">{selectedName}</div>
                <div className="text-xs text-gray-500">{selectedOnline ? "В сети" : "Не в сети"}</div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1 min-h-[300px]">
              {!threadLoaded ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : conversationExists ? (
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

                      <div className={`flex mb-3 ${group.senderIsStaff ? "justify-end" : "justify-start"}`}>
                        <div className="flex flex-col gap-1 max-w-[75%]">
                          {!group.senderIsStaff && (
                            <div className="text-xs text-gray-500 mb-0.5">{groupFirst.senderName}</div>
                          )}

                          {group.messages.map((m, mi) => {
                            const isLast = mi === group.messages.length - 1;

                            return (
                              <div key={m.id} className={`flex flex-col ${group.senderIsStaff ? "items-end" : "items-start"}`}>
                                <div
                                  className={`rounded-2xl px-4 py-2.5 text-sm break-words ${
                                    group.senderIsStaff ? "bubble-gradient rounded-tr-sm" : "bg-[#1c1c2b] rounded-tl-sm"
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
                                      group.senderIsStaff ? "flex-row-reverse" : ""
                                    }`}
                                  >
                                    {formatTime(m.createdAt)}
                                    {group.senderIsStaff &&
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
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center px-6">
                  Диалога ещё нет. Напишите первым — пользователь увидит сообщение в чате.
                </div>
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
                  placeholder="Написать пользователю..."
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
          </>
        )}
      </div>
    </div>
  );
}
