"use client";

import Link from "next/link";
import { useEffect } from "react";

// F-I (session-23): the segment error boundary. Until now an uncaught render
// fault (an RSC throw at document time, a client-island exception during
// hydration) rendered Next's framework-default error surface — unstyled,
// unbranded, no recovery affordance. This card gives the fault path the same
// treatment the 404 path already has (src/app/not-found.tsx): the measured
// slate palette, chrome-less (the fault may have originated IN the chrome),
// display serif, and an escape hatch — here TWO: the framework's reset
// (re-render the segment) and the home link.
//
// Rest-invisible by construction: this file ships in the bundle but renders
// only on faults — the parity census is unaffected (proven by the 18a=18b
// byte-equal ritual). The SSR document-path behavior follows the Next.js
// error-boundary contract (Reasoned, not wire-Verified — driving it honestly
// would need a fault-injection backdoor in production code, rejected; see
// docs/remediation-plan-session23.md §4).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server RSC faults already log server-side with their digest; this
    // surfaces the client-side half for observability.
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-slate-400 font-montserrat mb-4">
          Error
        </p>
        <h1 className="font-cormorant text-5xl font-light text-slate-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-500 font-montserrat mb-8 max-w-sm mx-auto">
          An unexpected error interrupted this page. Your bag and account are
          unaffected — trying again usually resolves it.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="inline-block bg-slate-900 text-white text-xs tracking-[0.25em] uppercase px-10 py-4 hover:bg-slate-700 transition-colors font-montserrat"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-block border border-slate-300 text-slate-900 text-xs tracking-[0.25em] uppercase px-10 py-4 hover:border-slate-900 transition-colors font-montserrat"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
