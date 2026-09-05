import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-[13px] text-slate-gray">
        <span>Not legal or medical advice.</span>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-signal-violet">
            Privacy
          </Link>
        </div>
      </div>
      <div className="flex h-1 w-full">
        <div className="flex-1 bg-mint-pulse" />
        <div className="flex-1 bg-signal-violet" />
        <div className="flex-1 bg-ink-black" />
      </div>
    </footer>
  );
}
