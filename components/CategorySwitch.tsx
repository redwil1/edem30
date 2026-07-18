export default function CategorySwitch() {
  return (
    <div className="flex bg-[#171723] rounded-2xl p-1 mb-6">
      <button className="flex-1 bg-violet-600 rounded-xl py-3 font-medium">
        🚐 Межгород
      </button>

      <button className="flex-1 py-3 text-gray-300">🚖 Такси</button>
    </div>
  );
}
