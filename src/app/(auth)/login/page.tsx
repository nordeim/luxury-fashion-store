import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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
  const { redirect: redirectTo } = await searchParams;
  return <AuthForm mode="signin" redirectTo={redirectTo ?? "/account"} />;
}
