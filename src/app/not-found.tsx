import Link from "next/link";

// Platform 404 — chrome-less (root level, outside (storefront)), pinned
// slate palette like the reference's 404 surface.

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-cormorant text-[120px] leading-none font-light text-slate-900 select-none">404</p>
        <h1 className="font-cormorant text-3xl font-light text-slate-700 -mt-4 mb-3">Page Not Found</h1>
        <p className="text-sm text-slate-500 font-montserrat mb-8 max-w-sm mx-auto">
          The page you are looking for has been moved, removed, or never existed.
        </p>
        <Link
          href="/"
          className="inline-block bg-slate-900 text-white text-xs tracking-[0.25em] uppercase px-10 py-4 hover:bg-slate-700 transition-colors font-montserrat"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
