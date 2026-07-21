type Props = {
  className?: string;
};

const BUILDINGS = [
  { x: 0, w: 34, h: 120 },
  { x: 38, w: 26, h: 175 },
  { x: 68, w: 30, h: 90 },
  { x: 102, w: 22, h: 210 },
  { x: 128, w: 34, h: 140 },
  { x: 166, w: 24, h: 235 },
  { x: 194, w: 30, h: 160 },
  { x: 228, w: 26, h: 195 },
  { x: 258, w: 34, h: 110 },
  { x: 296, w: 22, h: 220 },
  { x: 322, w: 30, h: 150 },
  { x: 356, w: 26, h: 185 },
];

export default function CitySkyline({ className = "" }: Props) {
  const maxH = 240;

  return (
    <svg
      viewBox="0 0 382 240"
      fill="none"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
    >
      {BUILDINGS.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={maxH - b.h}
          width={b.w}
          height={b.h}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
