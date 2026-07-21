type Props = {
  name: string;
  size?: number;
  tone?: "violet" | "neutral";
};

export default function Avatar({ name, size = 36, tone = "neutral" }: Props) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${
        tone === "violet"
          ? "bg-violet-600/30 border border-violet-500/30 text-violet-200"
          : "bg-[#242435] border border-white/10 text-gray-300"
      }`}
    >
      {initials}
    </div>
  );
}
