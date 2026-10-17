import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/account/auth-form";
import { extractNonce } from "@/lib/csp";
import { breadcrumbJsonLd, serializeJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Create Account",
  // F-T (session-26): the indexable statics carry canonicals (the PDP has
  // since its metadata shipped; the reference's auth pages carry them too).
  alternates: { canonical: "/register" },
};
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  // F-S (session-26): the breadcrumb is the parallel form of the measured
  // login block (the register page is clone-only — no reference evidence —
  // so the same two-ListItem shape with the page's own leaf).
  const cspHeader = (await headers()).get("content-security-policy") ?? "";
  const nonce = extractNonce(cspHeader) ?? undefined;
  const breadcrumb = breadcrumbJsonLd(
    [
      { name: "Home", path: "/" },
      { name: "register", path: "/register" },
    ],
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  );
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      <AuthForm mode="signup" redirectTo="/account" />
    </>
  );
}
