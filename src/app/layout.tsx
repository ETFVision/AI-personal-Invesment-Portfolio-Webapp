import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETFVision",
  description: "Intelligent ETF analytics and personal portfolio intelligence"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
