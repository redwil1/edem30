import { ShieldAlert } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <ShieldAlert size={40} className="text-red-400 mx-auto mb-4" />

            <h1 className="text-2xl font-bold mb-2">Доступ запрещён</h1>

            <p className="text-gray-400">
              Эта страница доступна только администраторам.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-[1400px] w-full mx-auto px-5 sm:px-6 lg:px-10 py-8 lg:py-10 flex-1">
        {children}
      </div>
    </main>
  );
}
