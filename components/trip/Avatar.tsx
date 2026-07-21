type Props = {
  name: string;
  size?: number;
  tone?: "violet" | "neutral";
};

export default function Avatar({ name, size = 36 }: Props) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="avatar-gradient rounded-full flex items-center justify-center font-bold shrink-0 text-gray-300"
    >
      {initials}
    </div>
  );
}
