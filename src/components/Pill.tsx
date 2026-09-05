import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-pill text-[15px] font-normal px-5 py-2.5 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed";

const VARIANTS = {
  primary: "bg-signal-violet text-pure-white hover:bg-signal-violet/90",
  outline: "bg-pure-white text-signal-violet border border-signal-violet hover:bg-tint-wash/40",
  ghost: "bg-transparent text-ink-black border border-mist-gray hover:border-ink-black",
};

type Variant = keyof typeof VARIANTS;

export function PillLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function PillButton({
  children,
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Small status pill used on line items and the results ribbon. */
export function Badge({
  children,
  tone = "mist",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "mint" | "mist";
  className?: string;
}) {
  return tone === "mint" ? (
    <span
      className={`inline-flex items-center gap-1 rounded-pill bg-mint-pulse text-ink-black text-[12px] font-normal px-3 py-1 ${className}`}
    >
      {children}
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border border-mist-gray text-ash-gray text-[12px] font-normal px-3 py-1 ${className}`}
    >
      {children}
    </span>
  );
}
