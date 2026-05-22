import AuthGuard from "@/app/(frontend)/components/auth-guard";
import type { ReactNode } from "react";

type PortfolioLayoutProps = {
  children: ReactNode;
};

export default function PortfolioLayout({ children }: PortfolioLayoutProps) {
  return <AuthGuard>{children}</AuthGuard>;
}
