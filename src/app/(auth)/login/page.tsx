import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Sign In" };
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
  return <AuthForm mode="signin" redirectTo={redirectTo ?? "/account"} />;
}
