import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Habit Assic",
    template: "%s · Habit Assic",
  },
  description: "Monitoring program ibadah harian anggota asrama.",
  applicationName: "Habit Assic",
  // Private app: never index (see also app/robots.ts).
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Habit Assic", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={fontSans.variable}>
      <body className="min-h-dvh bg-background antialiased">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster theme="light" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
