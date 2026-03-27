import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Background Check Tracker",
  description: "Minimal Next.js and Tailwind starter for the Background Check Tracker project.",
};

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-24">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-slate-50 p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Next.js + Tailwind
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Background Check Tracker
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
          The project scaffold is ready with the App Router, TypeScript,
          Tailwind CSS, and ESLint. Start building from here.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
            App Router
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
            TypeScript
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
            Tailwind CSS
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
            ESLint
          </span>
        </div>
      </section>
    </main>
  );
}
