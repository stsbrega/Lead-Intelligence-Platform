import type { Metadata } from "next";
import { Jost, Playfair_Display } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Providers from "@/components/layout/Providers";
import GlobalProgressBar from "@/components/ui/GlobalProgressBar";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lead Intelligence — Wealthsimple Advisors",
  description: "AI-powered lead generation for Wealthsimple financial advisors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jost.variable} ${playfair.variable} antialiased`}>
        <Providers>
          <GlobalProgressBar />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-60 p-8 min-w-0 overflow-x-hidden">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
