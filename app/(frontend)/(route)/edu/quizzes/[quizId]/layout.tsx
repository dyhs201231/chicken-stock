import AuthGuard from "@/app/(frontend)/components/auth-guard";
import type { ReactNode } from "react";

type EduLayoutProps = {
  children: ReactNode;
};

export default function EduLayout({ children }: EduLayoutProps) {
  return <AuthGuard>{children}</AuthGuard>;
}
