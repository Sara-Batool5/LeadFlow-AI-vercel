import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "LeadFlow AI — AI lead qualification, routing & follow-up",
  description: "Qualify, route and follow up every lead with an 8-agent AI workflow and human approval.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
