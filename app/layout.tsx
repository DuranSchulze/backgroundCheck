import type { Metadata } from "next";
import "./globals.css";
import { Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";

const sourceSans3 = Source_Sans_3({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Verification Tracking | Client Portal",
  description:
    "Track the real-time status of your background check processing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", sourceSans3.variable)}>
      <body className="min-h-screen bg-surface text-on-surface antialiased selection:bg-primary-fixed selection:text-primary">
        {children}
      </body>
    </html>
  );
}
