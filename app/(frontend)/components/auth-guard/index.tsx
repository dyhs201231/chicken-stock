import { authCheck } from "@/app/(frontend)/lib/auth-check";
import type { ReactNode } from "react";
import AuthRequiredRedirect from "./auth-required-redirect";

type AuthGuardProps = {
  children: ReactNode;
};

export default async function AuthGuard({ children }: AuthGuardProps) {
  const user = await authCheck();

  if (!user) {
    return <AuthRequiredRedirect />;
  }

  return children;
}
