import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Hour Friend — 60 Minutes. One Stranger. One Real Conversation.",
  description: "Anonymous 60-minute guidance, peace, and friendly conversations with zero judgment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-[#070709] text-zinc-100 antialiased selection:bg-amber-400/20 selection:text-amber-300">
        {children}
      </body>
    </html>
  );
}
