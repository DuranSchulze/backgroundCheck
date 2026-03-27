import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Background Check Tracker",
  description: "Minimal Next.js and Tailwind starter for the Background Check Tracker project.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
