import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import TrackingPortalDemo from "@/components/tracking/TrackingPortalDemo";

export const metadata: Metadata = {
  title: "Verification Tracking | Client Portal",
  description:
    "Enter your reference number to monitor your background check status in real-time.",
};

export default function Home() {
  return (
    <main className="h-screen overflow-hidden bg-surface">
      <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 py-10 sm:py-14">
          <Header />

        <header className="mb-12 text-center sm:mb-16">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
            Background Checking
          </p>
          <h1 className="mb-5 text-on-surface font-headline text-4xl font-extrabold tracking-tight md:text-5xl">
            Verification Tracking
          </h1>
          <p className="mx-auto max-w-xl text-base leading-8 text-on-surface-variant sm:text-lg">
            Enter your reference number to monitor your background check status
            in real-time.
          </p>
        </header>

        <TrackingPortalDemo />
      </div>
    </main>
  );
}
