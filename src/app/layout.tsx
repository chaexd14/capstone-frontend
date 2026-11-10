import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { connection } from "next/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "TalentMatch · AI Resume Screening & Candidate Evaluation",
  description: "Explainable, merit-based AI candidate screening and job matching platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground"
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
