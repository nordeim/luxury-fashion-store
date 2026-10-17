import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";
import { AuthForm } from "@/components/account/auth-form";
import { extractNonce } from "@/lib/csp";
import { breadcrumbJsonLd, serializeJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Sign In",
  // F-T (session-26): the reference ships a canonical on its login page
  // (measured 2026-10-17); the four indexable statics carry them now.
  alternates: { canonical: "/login" },
};
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  const { redirect: redirectToParam } = await searchParams;
  // H-1 (session-5): repeated keys arrive as string[] — coerce before use.
  const redirectTo = firstParam(redirectToParam);
  // F-S (session-26): the page-level breadcrumb graph — the reference's
  // login head carries BreadcrumbList [Home → origin/, login → origin/login]
  // (measured 2026-10-17); same nonce discipline as the (auth) layout's
  // site-level blocks.
  const cspHeader = (await headers()).get("content-security-policy") ?? "";
  const nonce = extractNonce(cspHeader) ?? undefined;
  const breadcrumb = breadcrumbJsonLd(
    [
      { name: "Home", path: "/" },
      { name: "login", path: "/login" },
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
      <AuthForm mode="signin" redirectTo={redirectTo ?? "/account"} />
    </>
  );
}
