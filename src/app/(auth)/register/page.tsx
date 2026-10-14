import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Create Account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  return <AuthForm mode="signup" redirectTo="/account" />;
}
