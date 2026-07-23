import Link from "next/link";
import { Send, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="font-display btn-gradient w-10 h-10 rounded-xl flex items-center justify-center font-bold">
              Е
            </div>

            <div className="font-display font-bold">
              Едем<span className="text-violet-400">30</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-3">По городу и межгороду</div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-400">
          <Link href="/about" className="hover:text-white transition">
            О сервисе
          </Link>

          <Link href="/faq" className="hover:text-white transition">
            Вопросы и ответы
          </Link>

          <Link href="/terms" className="hover:text-white transition">
            Пользовательское соглашение
          </Link>

          <Link href="/contacts" className="hover:text-white transition">
            Контакты
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-400 md:items-end">
          <a
            href="https://t.me/edem30bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-white transition"
          >
            <Send size={14} className="text-violet-400" />
            Поддержка: @edem30bot
          </a>

          <div className="flex items-center gap-2">
            <Mail size={14} className="text-violet-400" />
            support@edem30.ru
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 py-5 text-xs text-gray-600">
          © 2024 Едем30. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
