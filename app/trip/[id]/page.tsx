import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getTripById,
  getTripLifecycle,
  getTripOwnerId,
  isInstantTaxiTrip,
} from "@/lib/trips";
import { hasReviewed } from "@/lib/reviews";
import Navbar from "@/components/layout/Navbar";
import TripInfoCard from "@/components/trip/TripInfoCard";
import TripFlowCards from "@/components/trip/TripFlowCards";
import CancelTripButton from "@/components/trip/CancelTripButton";
import ParticipantsList from "@/components/trip/ParticipantsList";
import SafetyCard from "@/components/trip/SafetyCard";
import ChatPanel from "@/components/trip/ChatPanel";
import ReviewBanner from "@/components/trip/ReviewBanner";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TripPage({ params }: Props) {
  const { id } = await params;

  const trip = getTripById(Number(id));

  if (!trip) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white">
        <Navbar />

        <div className="flex items-center justify-center py-32">
          <h1 className="text-3xl font-bold">Поездка не найдена</h1>
        </div>
      </main>
    );
  }

  const user = await getCurrentUser();

  const participantRows = db
    .prepare(
      `SELECT users.id as id, users.name as name
       FROM trip_participants
       JOIN users ON users.id = trip_participants.user_id
       WHERE trip_participants.trip_id = ?
       ORDER BY trip_participants.joined_at ASC`
    )
    .all(trip.id) as { id: number; name: string }[];

  const participants = participantRows.map((r) => ({
    id: r.id,
    name: r.name,
    isYou: user ? r.id === user.id : false,
  }));

  const joined = !!user && participants.some((p) => p.isYou);

  const ownerId = getTripOwnerId(trip.id);
  const lifecycle = getTripLifecycle(trip.id);

  const isDriver = !!user && ownerId === user.id;
  const isParty = isDriver || joined;

  if ((lifecycle.completed || lifecycle.cancelled) && !isParty) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white">
        <Navbar />

        <div className="flex items-center justify-center py-32">
          <h1 className="text-3xl font-bold">Поездка не найдена</h1>
        </div>
      </main>
    );
  }

  const instantTaxi = isInstantTaxiTrip(trip.id);

  const canReviewAsPassenger =
    !!user &&
    joined &&
    !isDriver &&
    lifecycle.completed &&
    !hasReviewed(trip.id, user.id);

  const soleParticipant =
    participants.length === 1 ? participants[0] : null;

  const canReviewAsDriver =
    !!user &&
    isDriver &&
    lifecycle.completed &&
    !!soleParticipant &&
    !soleParticipant.isYou &&
    !hasReviewed(trip.id, user.id);

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white pb-14">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 pt-6 lg:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition border border-white/10 rounded-xl px-4 py-2.5 mb-6"
        >
          <ArrowLeft size={15} />
          Назад к списку
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
          <div className="flex flex-col gap-6">
            <TripInfoCard trip={trip} joined={joined} />

            {lifecycle.cancelled ? (
              <div className="bg-[#12121c] border border-red-500/20 rounded-3xl p-4 sm:p-6 text-red-400 font-bold">
                Поездка отменена
              </div>
            ) : (
              (isDriver || joined) && (
                <TripFlowCards
                  tripId={trip.id}
                  instantTaxi={instantTaxi}
                  initialPrice={trip.price}
                />
              )
            )}

            {isDriver && !lifecycle.started && !lifecycle.completed && !lifecycle.cancelled && (
              <CancelTripButton tripId={trip.id} />
            )}

            <ParticipantsList participants={participants} />
            <SafetyCard />
          </div>

          <ChatPanel tripId={trip.id} />
        </div>

        {canReviewAsPassenger && (
          <div className="mt-6">
            <ReviewBanner tripId={trip.id} />
          </div>
        )}

        {canReviewAsDriver && soleParticipant && (
          <div className="mt-6">
            <ReviewBanner
              tripId={trip.id}
              revieweeId={soleParticipant.id}
              title={`Оцените пассажира ${soleParticipant.name}`}
              subtitle="Ваша оценка помогает другим водителям"
            />
          </div>
        )}
      </div>
    </main>
  );
}
