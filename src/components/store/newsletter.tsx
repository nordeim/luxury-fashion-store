"use client";

// Newsletter — parity surface (dark section with vertical grid lines):
// bg-primary text-primary-foreground py-24, 8 hairline columns opacity-5,
// THE VELOUR JOURNAL kicker, "Join the Inner *Circle*" h2, email input +
// white SUBSCRIBE button (hover:bg-gold), privacy note.
// Working superset: posts /api/newsletter (idempotent upsert) with inline
// confirmation.

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "pending") return;
    setState("pending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setState("done");
        setMessage("Welcome to the Inner Circle.");
      } else {
        setState("error");
        setMessage(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <section className="py-24 px-6 relative overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        {[12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100].map((left) => (
          <div key={left} className="absolute border-l border-primary-foreground h-full" style={{ left: `${left}%` }} />
        ))}
      </div>
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <div className="text-[10px] tracking-[0.5em] text-primary-foreground/60 font-montserrat mb-4">
          THE VELOUR JOURNAL
        </div>
        <h2 className="font-cormorant text-5xl lg:text-6xl font-light mb-4">
          Join the Inner <span className="italic">Circle</span>
        </h2>
        <p className="text-sm font-montserrat text-primary-foreground/70 leading-relaxed mb-10 max-w-md mx-auto">
          Be the first to discover new arrivals, exclusive offers, and stories from behind the ateliers.
        </p>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            aria-label="Your email address"
            className="flex-1 bg-transparent border border-primary-foreground/30 px-5 py-4 text-sm font-montserrat placeholder:text-primary-foreground/40 focus:outline-none focus:border-primary-foreground/60 text-primary-foreground"
          />
          <button
            type="submit"
            disabled={state === "pending"}
            className="bg-primary-foreground text-primary px-8 py-4 text-xs tracking-[0.2em] uppercase font-montserrat font-medium hover:bg-gold hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {state === "done" ? (
              <>
                Joined <Check size={14} strokeWidth={2} />
              </>
            ) : (
              <>
                Subscribe <ArrowRight size={14} strokeWidth={2} />
              </>
            )}
          </button>
        </form>
        {message && (
          <p className={`text-xs font-montserrat mt-4 tracking-wider ${state === "error" ? "text-red-400" : "text-primary-foreground/70"}`} role="status">
            {message}
          </p>
        )}
        <p className="text-[10px] text-primary-foreground/40 font-montserrat mt-4 tracking-wider">
          By subscribing you agree to our Privacy Policy. Unsubscribe at any time.
        </p>
      </div>
    </section>
  );
}
