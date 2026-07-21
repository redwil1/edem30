"use client";

type Props = {
  open: boolean;
};

export default function LoadingScreen({ open }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[#0b0b13]/95 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="text-6xl animate-spin mb-5">🚐</div>

        <h2 className="text-2xl font-bold">Ищем поездки...</h2>

        <p className="text-gray-400 mt-2">Это займёт меньше секунды</p>
      </div>
    </div>
  );
}
