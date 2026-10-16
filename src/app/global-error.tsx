"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";

// F-I (session-23): the ROOT error boundary — the last resort when the root
// layout itself faults (src/app/error.tsx never sees those: a boundary only
// catches its CHILDREN). Next requires it to render its own <html>/<body> and
// it does NOT inherit the root layout — so globals.css is imported here for
// the tokens/@font-face. Same measured slate language as the 404 card and the
// segment boundary; rest-invisible by construction (renders only on
// root-level faults).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50">
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase text-slate-400 font-montserrat mb-4">
              Error
            </p>
            <h1 className="font-cormorant text-5xl font-light text-slate-900 mb-3">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500 font-montserrat mb-8 max-w-sm mx-auto">
              A critical error interrupted the application. Please try again.
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
      </body>
    </html>
  );
}
