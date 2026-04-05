import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-surface text-on-surface antialiased selection:bg-primary-fixed selection:text-primary">
        {children}
      </body>
    </html>
  );
}
