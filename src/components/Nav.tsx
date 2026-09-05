import Link from "next/link";
import { Logo } from "./Logo";
import { PillLink } from "./Pill";

export function Nav() {
  return (
    <div className="sticky top-4 z-50 flex justify-center px-4">
      <nav className="flex w-full max-w-[880px] items-center justify-between gap-4 rounded-nav bg-pure-white px-5 py-3 shadow-nav">
        <Link href="/" aria-label="BillBuster home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-1 text-[15px] text-ink-black sm:flex">
          <Link href="/#how-it-works" className="px-2 hover:text-signal-violet">
            How it works
          </Link>
          <span className="text-mist-gray">·</span>
          <Link href="/privacy" className="px-2 hover:text-signal-violet">
            Privacy
          </Link>
        </div>
        <PillLink href="/#upload" className="text-[14px] px-4 py-2">
          Analyze a bill →
        </PillLink>
      </nav>
    </div>
  );
}
