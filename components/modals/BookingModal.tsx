"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function BookingModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="w-full max-w-md bg-[#171726] rounded-t-3xl p-6">
        <h2 className="text-2xl font-bold text-white">Почти готово 🚐</h2>

        <p className="text-gray-400 mt-3 leading-7">
          Чтобы забронировать место, войдите по номеру телефона. Это займет
          меньше 15 секунд.
        </p>

        <button className="w-full mt-8 bg-violet-600 rounded-2xl py-4 font-bold hover:bg-violet-700 transition">
          Войти по SMS
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 border border-gray-600 rounded-2xl py-4 text-gray-300"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
