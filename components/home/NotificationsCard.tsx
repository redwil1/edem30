import { Bell } from "lucide-react";

import PushSubscribeButton from "@/components/PushSubscribeButton";

export default function NotificationsCard() {
  return (
    <div className="bg-[#12121c] border border-violet-500/20 rounded-3xl p-4 sm:p-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
          <Bell size={16} className="text-violet-400" />
        </div>
        <div className="font-display font-bold">Не пропустите важное</div>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed mb-4">
        Включите уведомления, чтобы сразу узнавать об откликах попутчиков,
        сообщениях от водителя и статусе поездки.{" "}
        <span className="text-gray-300 font-medium">
          Особенно важно для владельцев iPhone
        </span>{" "}
        — на iOS без этого push-уведомления не работают вообще, даже если
        сайт установлен на экран «Домой».
      </p>

      <PushSubscribeButton />
    </div>
  );
}
