import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DirectChatCard from "@/components/chat/DirectChatCard";
import { getCurrentUser } from "@/lib/auth";
import { isDirectConversationParticipant } from "@/lib/conversations";
import { notFound } from "next/navigation";

export default async function DirectMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversationId = Number(id);

  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-gray-400 mb-5">Войдите, чтобы открыть чат.</p>
            <Link
              href={`/login?redirect=/dm/${id}`}
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

  if (!Number.isInteger(conversationId) || conversationId <= 0) notFound();

  const isParticipant = await isDirectConversationParticipant(conversationId, user.id);
  if (!isParticipant) notFound();

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md w-full mx-auto px-5 py-10 flex-1 flex flex-col">
        <DirectChatCard conversationId={conversationId} />
      </div>

      <Footer />
    </main>
  );
}
