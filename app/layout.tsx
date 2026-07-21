import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import RoleThemeSync from "@/components/auth/RoleThemeSync";
import DriverOrderNotifier from "@/components/taxi/DriverOrderNotifier";
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
      className={`${manrope.variable} ${unbounded.variable} h-full antialiased`}
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
