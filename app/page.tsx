import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck, Zap, Users } from "lucide-react";
import TrackingPortalDemo from "@/components/tracking/TrackingPortalDemo";

export const metadata: Metadata = {
  title: "Verification Tracking | Client Portal",
  description:
    "Enter your reference number to monitor your background check status in real-time.",
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-surface relative overflow-x-hidden">
      {/* Fixed navbar */}
      <header className="fixed top-0 w-full z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex items-center justify-center h-16 px-6 w-full max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Image
              src="/branding/filepino-logo.png"
              alt="Filepino"
              width={160}
              height={80}
              priority
              className="h-auto w-[110px] sm:w-[130px]"
            />
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-[0.24em] text-primary border-l border-outline-variant/40 pl-3">
              Client Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 pt-28 pb-20 relative">
        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute bottom-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10" />
        <div className="pointer-events-none absolute top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10" />

        {/* Hero */}
        <div className="w-full max-w-2xl text-center mb-10">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
            Background Checking
          </p>
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-on-surface mb-5 tracking-tight">
            Track Progress
          </h1>
          <p className="text-on-surface-variant max-w-md mx-auto text-sm leading-relaxed sm:text-base">
            Enter your reference number to monitor your background check status
            in real-time.
          </p>
        </div>

        {/* Search card */}
        <div className="w-full max-w-xl bg-white shadow-[0_12px_32px_rgba(35,27,8,0.07)] border border-outline-variant/20 p-8 sm:p-10">
          <TrackingPortalDemo />
        </div>

        {/* Feature cards */}
        <div className="w-full max-w-5xl mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-8 flex flex-col gap-4 border border-outline-variant/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h3 className="font-headline font-bold text-xl text-on-surface">
              Standard Protocol
            </h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Our multi-stage verification process ensures every credential
              meets the Filepino standard for thorough and accurate background
              checks.
            </p>
          </div>
          <div className="bg-surface-container-low p-8 flex flex-col gap-4 border border-outline-variant/10">
            <Zap className="h-8 w-8 text-primary" />
            <h3 className="font-headline font-bold text-xl text-on-surface">
              Real-time Updates
            </h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Track every step from submission to final approval with
              instantaneous status updates from our verification pipeline.
            </p>
          </div>
          <div className="bg-surface-container-low p-8 flex flex-col gap-4 border border-outline-variant/10">
            <Users className="h-8 w-8 text-primary" />
            <h3 className="font-headline font-bold text-xl text-on-surface">
              Expert Review
            </h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Every automated check is backed by a dedicated human review team
              to maintain the highest standard of verification accuracy.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low w-full py-10 border-t border-outline-variant/20">
        <div className="flex flex-col md:flex-row items-center justify-between px-8 gap-4 w-full max-w-5xl mx-auto">
          <p className="text-xs tracking-wide uppercase text-outline">
            © 2024 Filepino · Background Check Services
          </p>
          <div className="flex gap-8">
            <a
              className="text-xs tracking-wide uppercase text-outline hover:text-primary transition-colors"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="text-xs tracking-wide uppercase text-outline hover:text-primary transition-colors"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="text-xs tracking-wide uppercase text-outline hover:text-primary transition-colors"
              href="#"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
