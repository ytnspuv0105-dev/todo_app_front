import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

const sans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const display = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Todo管理",
  description: "チームで課題を管理するアプリ",
  applicationName: "Todo管理",
  appleWebApp: {
    capable: true,
    title: "Todo管理",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2c6a4f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${sans.variable} ${display.variable}`}>
        <RegisterServiceWorker />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
