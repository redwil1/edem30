"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
};

export default function DateModal({ open, onClose, onSelect }: Props) {
  if (!open) return null;

  const dates = ["Сегодня", "Завтра", "Послезавтра"];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-[#171726] w-full max-w-md rounded-t-3xl p-6">
        <h2 className="text-2xl font-bold mb-6">Когда едем?</h2>

        <div className="space-y-2">
          {dates.map((date) => (
            <button
              key={date}
              onClick={() => {
                onSelect(date);
                onClose();
              }}
              className="w-full text-left p-4 rounded-xl bg-[#222233] hover:bg-violet-600 transition"
            >
              📅 {date}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
