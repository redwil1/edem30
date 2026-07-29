import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SupportChatCard from "@/components/profile/SupportChatCard";
import { getCurrentUser } from "@/lib/auth";

export default async function ChatPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-gray-400 mb-5">
              Войдите, чтобы написать в поддержку.
            </p>

            <Link
              href="/login?redirect=/chat"
              className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 font-bold"
            >
              Войти
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md w-full mx-auto px-5 py-10 flex-1">
        <h1 className="text-3xl font-bold mb-6">Чат</h1>

        <SupportChatCard />
      </div>

      <Footer />
    </main>
  );
}
