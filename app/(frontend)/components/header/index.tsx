import Link from "next/link";
import Logo from "../icons/logo";
import HeaderSearch from "./header-search";
import HeaderAuthStatus from "./auth-status";
import HeaderNavigation from "./header-navigation";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white font-sans font-normal text-black">
      <div className="mx-auto flex h-18 w-full max-w-360 items-center justify-between px-5">
        <div className="flex gap-18">
          <Link href="/" className="flex shrink-0 items-center gap-1">
            <Logo />
            <span className="text-xl text-[#DF2B2E]">치킨스톡</span>
          </Link>

          <HeaderNavigation />
        </div>

        <div className="flex gap-4">
          <HeaderSearch />

          <HeaderAuthStatus />
        </div>
      </div>
    </header>
  );
}
