import Link from "next/link";

import { Participant } from "@/types/chat";
import Avatar from "./Avatar";

type Props = {
  participants: Participant[];
};

export default function ParticipantsList({ participants }: Props) {
  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="font-display font-bold mb-4">
        Участники поездки ({participants.length})
      </div>

      <div className="space-y-3.5">
        {participants.map((p) => {
          const inner = (
            <>
              <Avatar name={p.name} size={32} avatarUrl={p.avatarUrl} avatarPreset={p.avatarPreset} />

              <div className="text-sm">{p.name}</div>

              {p.isDriver && (
                <span className="text-xs bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-full">
                  Водитель
                </span>
              )}

              {p.isYou && (
                <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                  Вы
                </span>
              )}
            </>
          );

          if (p.isYou) {
            return (
              <div key={p.id} className="flex items-center gap-3">
                {inner}
              </div>
            );
          }

          return (
            <Link
              key={p.id}
              href={`/profile/${p.id}`}
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
