import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import DbProvider from "@/components/DbProvider";
import Shell from "@/components/Shell";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans-face",
  subsets: ["latin"],
});

// Huruf serif berkontras tinggi untuk judul, supaya layarnya terasa seperti
// halaman buku dan bukan seperti panel aplikasi biasa.
const display = Instrument_Serif({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Lema",
  description: "Baca buku Inggris tanpa berhenti tiap ketemu kata yang maknanya ambigu.",
};

// viewportFit cover diperlukan agar env(safe-area-inset-bottom) punya nilai di
// iPhone, sehingga bilah navigasi bawah tidak tertutup garis beranda.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1efe9" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <DbProvider>
          <Shell>{children}</Shell>
        </DbProvider>
      </body>
    </html>
  );
}
