import AuthGuard from "@/app/(frontend)/components/auth-guard";
import type { ReactNode } from "react";

type MyLayoutProps = {
  children: ReactNode;
};

export default function MyLayout({ children }: MyLayoutProps) {
  return <AuthGuard>{children}</AuthGuard>;
}
