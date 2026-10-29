import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from 'next/font/local';
import "./globals.css";

const NovecentoSansBld = localFont({
  src: '../public/fonts/Novecentosanswide-DemiBold.otf',
  variable: '--font-novecento-bld'
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legatus Callback Relay",
  description: "Hosted callback and API bridge service for receiving and forwarding external webhook payloads.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${NovecentoSansBld.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
