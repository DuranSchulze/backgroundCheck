import type { Metadata } from "next";
import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["400", "600", "700", "800"],
});

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
    <html lang="en" className={cn(inter.variable, manrope.variable)}>
      <body className="min-h-screen bg-surface text-on-surface antialiased selection:bg-primary-fixed selection:text-primary">
        {children}
      </body>
    </html>
  );
}
