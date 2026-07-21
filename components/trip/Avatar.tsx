type Props = {
  name: string;
  size?: number;
  tone?: "violet" | "neutral";
  avatarUrl?: string | null;
};

export default function Avatar({ name, size = 36, avatarUrl }: Props) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="avatar-gradient rounded-full flex items-center justify-center font-bold shrink-0 text-gray-300"
    >
      {initials}
    </div>
  );
}
