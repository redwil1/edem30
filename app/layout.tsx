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
import VisitTracker from "@/components/VisitTracker";
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
  title: "Едем30 — по городу и межгороду",
  description: "Расписание рейсов, поиск попутчиков и заказ такси в одном месте",
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
            <DriverOrderNotifier />
            <TripReminderNotifier />
            <EmptyTripNotifier />
            <NewTripNotifier />
            {children}
            <BottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
