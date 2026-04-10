"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, LogIn, ShieldCheck, User } from "lucide-react";
import { gooeyToast } from "@/components/ui/goey-toaster";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await gooeyToast.promise(
        (async () => {
          const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });

          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            throw new Error(payload.error || "Unable to log in.");
          }
        })(),
        {
          loading: "Signing in...",
          success: "Access granted",
          error: "Login failed",
          description: {
            success:
              "Redirecting to the background check operations dashboard.",
            error:
              "Please verify the admin username and password configured in your environment.",
          },
        },
      );

      router.replace("/admin");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to log in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
        {/* Left: Brand + info */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 border border-outline-variant/40 bg-surface-container-low px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-outline">
              Protected Admin Access
            </span>
          </div>

          <h1 className="font-headline text-4xl font-extrabold leading-tight text-on-surface md:text-5xl">
            Operations Console
          </h1>

          <p className="max-w-md text-base leading-8 text-on-surface-variant">
            Secure access to the background check operations dashboard.
            Credentials are configured via environment variables.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "View live Google Sheets order queue",
              "Manage assignees and staff directory",
              "Monitor verification pipeline status",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 bg-primary" />
                <span className="text-sm text-on-surface-variant">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login form */}
        <div className="border border-outline-variant/30 bg-white p-8 shadow-[0_8px_32px_rgba(35,27,8,0.06)]">
          <div className="mb-6 border-b border-outline-variant/20 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-outline">
              Admin Sign In
            </p>
            <h2 className="mt-2 font-headline text-xl font-bold text-on-surface">
              Enter your credentials
            </h2>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <fieldset
              disabled={isSubmitting}
              className="space-y-4 disabled:opacity-100"
            >
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-outline"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full border border-outline-variant bg-white pl-11 pr-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-outline"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full border border-outline-variant bg-white pl-11 pr-12 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((v) => !v)}
                    disabled={isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-outline transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
                    aria-pressed={isPasswordVisible}
                    aria-label={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                  >
                    {isPasswordVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </fieldset>

            {error ? (
              <div className="flex items-start gap-3 border border-error/30 bg-error-container px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                <p className="text-sm text-error">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2.5 border border-[#f0ca52] bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
