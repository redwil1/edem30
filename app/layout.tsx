import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import RoleThemeSync from "@/components/auth/RoleThemeSync";
import DriverOrderNotifier from "@/components/taxi/DriverOrderNotifier";
import TripReminderNotifier from "@/components/trip/TripReminderNotifier";
import EmptyTripNotifier from "@/components/trip/EmptyTripNotifier";
import NewTripNotifier from "@/components/NewTripNotifier";
import ChatMessageNotifier from "@/components/ChatMessageNotifier";
import ComplaintNoticeNotifier from "@/components/ComplaintNoticeNotifier";
import RealNameNotifier from "@/components/RealNameNotifier";
import PendingReviewNotifier from "@/components/PendingReviewNotifier";
import VisitTracker from "@/components/VisitTracker";
import OnlineHeartbeat from "@/components/OnlineHeartbeat";
import SupportChatWidget from "@/components/support/SupportChatWidget";
import BottomNav from "@/components/layout/BottomNav";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://edem30.ru"),
  title: {
    default: "Едем30 — такси и попутчики по Астраханской области",
    template: "%s · Едем30",
  },
  description:
    "Заказ такси и поиск попутчиков в Астрахани, Харабали и других городах Астраханской области. Расписание межгородних поездок, чат с водителем, отзывы.",
  openGraph: {
    siteName: "Едем30",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${manrope.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-16 lg:pb-0">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <RoleThemeSync />
            <VisitTracker />
            <OnlineHeartbeat />
            <DriverOrderNotifier />
            <TripReminderNotifier />
            <EmptyTripNotifier />
            <NewTripNotifier />
            <ChatMessageNotifier />
            <ComplaintNoticeNotifier />
            <RealNameNotifier />
            <PendingReviewNotifier />
            <SupportChatWidget />
            {children}
            <BottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
