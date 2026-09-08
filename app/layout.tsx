import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import DbProvider from "@/components/DbProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lema",
  description: "Baca buku Inggris tanpa berhenti tiap ketemu kata yang maknanya ambigu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><DbProvider>{children}</DbProvider></body>
    </html>
  );
}
