import type { Metadata } from "next";
import { Source_Serif_4, Inter, Kalam } from "next/font/google";
import { Providers } from "@/lib/providers/Providers";
import "./globals.css";

const serif = Source_Serif_4({
  variable: "--font-serif-google",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-sans-google",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const hand = Kalam({
  variable: "--font-hand-google",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deligo Admin",
  description: "Newsroom control center for Deligo News",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${hand.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
