export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="10" stroke="#000000" strokeWidth="1.2" />
        <circle cx="11" cy="11" r="6.5" stroke="#000000" strokeWidth="1.2" />
        <circle cx="11" cy="11" r="2.5" fill="#000000" />
      </svg>
      <span className="font-ui text-[15px] font-normal text-ink-black tracking-[-0.01em]">
        BillBuster
      </span>
    </span>
  );
}
