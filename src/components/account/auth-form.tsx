"use client";

// Auth card — parity surface (measured live on the reference /login):
// min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4; white/95
// backdrop-blur card, rounded-2xl shadow-2xl, top hairline gradient strip,
// p-8 sm:p-10; Google button (slate-700 on white, rounded-xl, official
// 4-color G), slate "or" divider, labeled inputs h-11 sm:h-12 rounded-xl
// bg-slate-50/50 with leading icons; demo-account hint is a registered
// superset (the reference shows its demo creds on the page too).

import { ArrowLeft, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { DEMO_USERS } from "@/lib/data/catalog";

interface AuthFormProps {
  mode: "signin" | "signup";
  redirectTo: string;
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const isSignIn = mode === "signin";
  const [state, formAction, pending] = useActionState(
    isSignIn ? loginAction : registerAction,
    null as never,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push(state.data.redirect);
      router.refresh();
    }
  }, [state, router]);

  const inputCls =
    "flex w-full rounded-xl pl-10 pr-3 h-11 sm:h-12 bg-slate-50/50 border border-slate-200 text-base md:text-sm placeholder:text-slate-600 focus:border-slate-400 focus:ring-slate-400 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors";
  const labelCls = "text-sm font-medium text-slate-700";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl text-card-foreground">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
              <div className="w-full">
                {isSignIn ? (
                  <>
                    <Link
                      href="/"
                      className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors -mb-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to store
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 mt-6">
                      Welcome to AURELIA
                    </h1>
                    <p className="text-sm text-slate-500">Sign in to your account to continue</p>
                  </>
                ) : (
                  <>
                    <Link
                      href="/"
                      className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors -mb-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to sign in
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 mt-6">
                      Create your account
                    </h1>
                    <p className="text-sm text-slate-500">Join the Inner Circle</p>
                  </>
                )}
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 px-5 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all duration-200 font-medium text-[16px] group"
                aria-label="Continue with Google (visual only on the reference)"
                title="Google sign-in is visual-only — use email below (registered divergence)"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative my-1 w-full">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="shrink-0 h-[1px] w-full bg-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-500 font-medium tracking-wider">or</span>
                </div>
              </div>

              <form action={formAction} className="w-full space-y-3 sm:space-y-4">
                <input type="hidden" name="redirect" value={redirectTo} />
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className={labelCls} htmlFor="email">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        className={inputCls}
                      />
                    </div>
                    {state && !state.ok && state.error.fieldErrors?.email && (
                      <p className="text-xs text-red-600" role="alert">{state.error.fieldErrors.email}</p>
                    )}
                  </div>
                  {!isSignIn && (
                    <div className="space-y-1.5 text-left">
                      <label className={labelCls} htmlFor="confirmName">Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                        <input
                          id="confirmName"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Your name (optional)"
                          maxLength={80}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label className={labelCls} htmlFor="password">Password</label>
                      {isSignIn && (
                        <span className="text-xs text-slate-500" title="Demo environment — password resets are not wired">
                          Forgot password?
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        autoComplete={isSignIn ? "current-password" : "new-password"}
                        placeholder={isSignIn ? "••••••••" : "Min. 8 characters"}
                        className={inputCls}
                      />
                    </div>
                    {state && !state.ok && state.error.fieldErrors?.password && (
                      <p className="text-xs text-red-600" role="alert">{state.error.fieldErrors.password}</p>
                    )}
                  </div>
                  {!isSignIn && (
                    <div className="space-y-1.5 text-left">
                      <label className={labelCls} htmlFor="confirmPassword">Re-enter password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          required
                          autoComplete="new-password"
                          placeholder="Re-enter password"
                          className={inputCls}
                        />
                      </div>
                      {state && !state.ok && state.error.fieldErrors?.confirmPassword && (
                        <p className="text-xs text-red-600" role="alert">{state.error.fieldErrors.confirmPassword}</p>
                      )}
                    </div>
                  )}
                </div>

                {state && !state.ok && !state.error.fieldErrors && (
                  <p className="text-sm text-red-600 text-center" role="alert">
                    {state.error.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full bg-primary text-primary-foreground hover:bg-slate-700 py-3.5 rounded-xl text-sm font-medium tracking-[0.15em] uppercase transition-colors disabled:opacity-60"
                >
                  {pending ? "Please wait…" : isSignIn ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="text-sm text-slate-500">
                {isSignIn ? (
                  <>
                    Need an account?{" "}
                    <Link href="/register" className="font-medium text-slate-900 hover:underline underline-offset-4">
                      Sign up
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-slate-900 hover:underline underline-offset-4">
                      Sign in
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4 font-montserrat">
          Demo accounts — customer: {DEMO_USERS.customer.email} / {DEMO_USERS.customer.password} · admin: {DEMO_USERS.admin.email} / {DEMO_USERS.admin.password}
        </p>
      </div>
    </main>
  );
}
