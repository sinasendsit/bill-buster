export const metadata = {
  title: "Privacy — BillBuster",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-col items-center px-6 pb-24 pt-20">
      <div className="w-full max-w-[720px]">
        <h1 className="font-display font-light text-heading-lg text-ink-black">Privacy</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ash-gray">
          Plain and honest, no legal filler.
        </p>

        <div className="mt-10 space-y-8">
          <section>
            <h2 className="text-[20px] text-ink-black">How your bill is handled</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ash-gray">
              Your bill is processed in memory for the length of your request and is not stored on
              our servers. The document you upload is sent to Anthropic&apos;s Claude API to be
              read and analyzed — that is the only place it leaves this app.
            </p>
          </section>

          <section className="rounded-cards border-l-2 border-signal-violet bg-fog-gray p-6">
            <h2 className="text-[20px] text-ink-black">We are not yet HIPAA-certified</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-black">
              BillBuster does not currently have a HIPAA Business Associate Agreement (BAA) in
              place with Anthropic. Until it does, please redact patient names, account numbers,
              and any other identifying numbers before uploading a bill. The analysis works fine
              on a redacted bill — none of that information affects the codes, charges, or flags.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] text-ink-black">No accounts, no tracking</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ash-gray">
              There are no user accounts and nothing about your bill is logged for marketing or
              analytics. Our hosting provider keeps basic access logs (like any website) for
              security and uptime — nothing more.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] text-ink-black">If something looks wrong</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ash-gray">
              This tool can misread a code or miss context a human would catch. Always verify a
              flagged charge against your paper bill before you act on it. If you spot a result
              that looks wrong, email{" "}
              <a href="mailto:bigdelisin@gmail.com" className="text-signal-violet hover:underline">
                bigdelisin@gmail.com
              </a>{" "}
              and tell us what you found.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] text-ink-black">Not legal or medical advice</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ash-gray">
              BillBuster explains bills and flags things worth questioning. It does not provide
              legal or medical advice, and using it does not create any professional relationship.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
