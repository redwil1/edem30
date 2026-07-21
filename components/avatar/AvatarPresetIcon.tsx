import { User } from "lucide-react";

import { avatarPresetColor } from "@/lib/avatarPresets";

type Props = {
  preset: string;
  size?: number;
};

export default function AvatarPresetIcon({ preset, size = 36 }: Props) {
  const color = avatarPresetColor(preset) ?? "#4b5563";

  return (
    <div
      style={{ width: size, height: size, backgroundColor: color }}
      className="rounded-full flex items-center justify-center shrink-0"
    >
      <User size={Math.round(size * 0.58)} className="text-white/90" strokeWidth={2} />
    </div>
  );
}
