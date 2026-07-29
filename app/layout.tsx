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
import AdminComplaintAlert from "@/components/admin/AdminComplaintAlert";
import RealNameNotifier from "@/components/RealNameNotifier";
import PendingReviewNotifier from "@/components/PendingReviewNotifier";
import VisitTracker from "@/components/VisitTracker";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import OnlineHeartbeat from "@/components/OnlineHeartbeat";
import SupportChatWidget from "@/components/support/SupportChatWidget";
import BottomNav from "@/components/layout/BottomNav";
import JsonLd from "@/components/seo/JsonLd";

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
  keywords: [
    "такси Астрахань",
    "попутчики Астрахань",
    "межгород Астраханская область",
    "Едем30",
    "поездки Харабали",
    "такси по городу",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "Едем30",
    locale: "ru_RU",
    type: "website",
    title: "Едем30 — такси и попутчики по Астраханской области",
    description:
      "Заказ такси и поиск попутчиков в Астрахани, Харабали и других городах Астраханской области.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Едем30 — такси и попутчики по Астраханской области",
    description:
      "Заказ такси и поиск попутчиков в Астрахани, Харабали и других городах Астраханской области.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Едем30",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "TaxiService",
  name: "Едем30",
  url: "https://edem30.ru",
  logo: "https://edem30.ru/pwa-icon-512",
  image: "https://edem30.ru/pwa-icon-512",
  description:
    "Сервис поиска попутчиков и заказа такси по Астрахани и Астраханской области.",
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Астраханская область",
  },
  email: "support@edem30.ru",
  sameAs: ["https://t.me/edem30bot"],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Едем30",
  url: "https://edem30.ru",
  inLanguage: "ru-RU",
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
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />

        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <RoleThemeSync />
            <VisitTracker />
            <ServiceWorkerRegister />
            <OnlineHeartbeat />
            <DriverOrderNotifier />
            <TripReminderNotifier />
            <EmptyTripNotifier />
            <NewTripNotifier />
            <ChatMessageNotifier />
            <ComplaintNoticeNotifier />
            <AdminComplaintAlert />
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
