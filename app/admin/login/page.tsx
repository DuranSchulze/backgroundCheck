"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to log in.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to log in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,192,0,0.18),_transparent_40%),linear-gradient(180deg,#fffdf6_0%,#fffbef_100%)] px-6 py-10 md:px-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-outline">
            Protected Admin Access
          </p>
          <h1 className="max-w-xl font-headline text-4xl font-extrabold leading-tight text-on-surface md:text-5xl">
            Sign in to verify the live Google Sheets connection
          </h1>
          <p className="max-w-xl text-base leading-8 text-on-surface-variant">
            This temporary admin login uses hardcoded environment credentials and
            provides read-only access to intake rows loaded from your Google Sheet.
          </p>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-white p-8 shadow-[0_18px_60px_rgba(66,44,0,0.08)]">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-outline"
              >
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-[1.2rem] border border-amber-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-outline"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-[1.2rem] border border-amber-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <p className="rounded-[1rem] border border-[#f4c4be] bg-[#fff0ee] px-4 py-3 text-sm text-error">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full border border-[#f0ca52] bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary)] transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
