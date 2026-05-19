import Link from "next/link";
import Logo from "./_components/logo";
import HeaderSearch from "./_components/header-search";
import HeaderAuthStatus from "./_components/auth-status";

const NAVIGATION = [
  {
    label: "학습",
    href: "/edu",
  },
  {
    label: "포트폴리오",
    href: "/portfolio",
  },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white font-sans font-normal text-black">
      <div className="mx-auto flex h-18 w-full max-w-360 items-center justify-between px-5">
        <div className="flex gap-18">
          <Link href="/" className="flex items-center gap-1">
            <Logo />
            <span className="text-xl text-[#DF2B2E]">치킨스톡</span>
          </Link>

          <div className="flex gap-2">
            {NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-[50px] w-[130px] items-center justify-center text-xl duration-200 hover:font-semibold"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <HeaderSearch />

          <HeaderAuthStatus />
        </div>
      </div>
    </header>
  );
}
