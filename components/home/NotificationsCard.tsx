import { Bell } from "lucide-react";

import PushSubscribeButton from "@/components/PushSubscribeButton";

export default function NotificationsCard() {
  return (
    <div className="relative bg-[#1c1213] border border-red-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="relative w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <Bell size={16} className="text-red-400" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        </div>

        <div className="flex items-center gap-2">
          <div className="font-display font-bold">Не пропустите важное</div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-red-400 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
            Важно
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed mb-4">
        Включите уведомления, чтобы сразу узнавать об откликах попутчиков,
        сообщениях от водителя и статусе поездки.{" "}
        <span className="text-red-300 font-medium">
          Особенно важно для владельцев iPhone
        </span>{" "}
        — на iOS без этого push-уведомления не работают вообще, даже если
        сайт установлен на экран «Домой».
      </p>

      <PushSubscribeButton />
    </div>
  );
}
