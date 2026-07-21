import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import RoleThemeSync from "@/components/auth/RoleThemeSync";
import DriverOrderNotifier from "@/components/taxi/DriverOrderNotifier";
import BottomNav from "@/components/layout/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-16 lg:pb-0">
        <AuthProvider>
          <RoleThemeSync />
          <DriverOrderNotifier />
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
