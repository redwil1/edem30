import { Clock, ShieldCheck, MessageCircle, Star } from "lucide-react";

const items = [
  {
    icon: Clock,
    title: "Актуальное расписание",
    text: "Всегда свежая информация о рейсах и наличии мест",
  },
  {
    icon: ShieldCheck,
    title: "Надежные перевозчики",
    text: "Проверенные водители и безопасные поездки",
  },
  {
    icon: MessageCircle,
    title: "Чат попутчиков",
    text: "Общайтесь, находите попутчиков и задавайте вопросы",
  },
  {
    icon: Star,
    title: "Отзывы и рейтинг",
    text: "Реальные отзывы помогают сделать правильный выбор",
  },
];

export default function WhyUs() {
  return (
    <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 py-10 lg:py-14">
      <h2 className="font-display font-bold text-xl sm:text-2xl mb-6 sm:mb-8">
        Почему выбирают нас
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-6">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title}>
              <div className="w-11 h-11 rounded-xl bg-violet-600/15 flex items-center justify-center mb-4">
                <Icon size={20} className="text-violet-400" />
              </div>

              <div className="font-display font-bold mb-2">{item.title}</div>

              <p className="text-sm text-gray-500 leading-relaxed">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
