// Content ported from PRESENTATIONS/results-ui-mockup.html's "How to negotiate" tab —
// restyled to the BillBuster visual spec (monochrome + violet + mint, no red/coral).

const GAME_PLAN = [
  { title: "Lead with the flagged charges.", body: "You're not begging — you're disputing specific errors and markups you can point to." },
  { title: "Be warm but firm.", body: "The person on the phone can help you. Make them want to." },
  { title: "Offer a lump sum to settle.", body: "“I can pay $X today to close this out” is your strongest card." },
  { title: "Anchor below your target.", body: "Want 50% off? Open around 30–35% so you meet in the middle." },
  { title: "Ask about financial assistance.", body: "Many nonprofit hospitals are required to offer charity care — always ask." },
  { title: "Get the deal in writing.", body: "Before you pay a dollar. No written agreement, no payment." },
];

const TACTICS = [
  {
    label: "Tactical empathy",
    title: "Label their side",
    why: "Naming what the other person is dealing with lowers their guard and makes them feel understood.",
    say: "It sounds like this is just the standard rate you're required to start from.",
  },
  {
    label: "Calibrated question",
    title: "“How am I supposed to do that?”",
    why: "A gentle open question hands your problem to them to solve — without saying no.",
    say: "I really want to pay this. How am I supposed to manage $8,000 on my income?",
  },
  {
    label: "Accusation audit",
    title: "Say the bad thing first",
    why: "Naming their likely objection before they do takes all the power out of it.",
    say: "This is going to sound like I'm trying to get out of paying — but I genuinely can't cover this amount.",
  },
  {
    label: "Mirroring",
    title: "Mirror them",
    why: "Repeat their last few words as a question. It keeps them talking and reveals wiggle room.",
    say: "Them: “We can't just remove charges.” You: “Can't just remove charges?”",
  },
  {
    label: "",
    title: "Aim for “that's right”",
    why: "Summarize their position until they say “that's right.” That's real agreement, not fake “you're right.”",
    say: "So the price is set, but there's a hardship process that can lower it — is that right?",
  },
  {
    label: "Extreme anchor",
    title: "Anchor low, land at half",
    why: "Open below your target so the middle lands where you actually want it.",
    say: "The most I can realistically pay today is $3,000 to close this out completely.",
  },
  {
    label: "Silence",
    title: "Then go quiet",
    why: "After you make your offer, stop talking. The silence pressures them, not you.",
    say: "(…say nothing, and let them respond first.)",
  },
  {
    label: "",
    title: "Get it in writing",
    why: "A verbal deal is not a deal. Lock it before any money moves.",
    say: "Can you email me written confirmation of this agreement before I make the payment?",
  },
];

export function NegotiatePlaybook() {
  return (
    <div className="space-y-10">
      <div className="rounded-cards border border-fog-gray p-6 sm:p-8">
        <h2 className="font-display font-light text-heading text-ink-black">
          Before you pay a cent — negotiate
        </h2>
        <p className="mt-3 max-w-[640px] text-[15px] leading-relaxed text-ash-gray">
          A hospital bill is the starting price, not the final one. Hospitals routinely settle
          for far less — especially if you can pay something now. You have specifics on your
          side (the flagged charges), which makes you a serious negotiator.
        </p>
        <div className="mt-5 rounded-inputs border-l-2 border-signal-violet bg-fog-gray px-5 py-4">
          <p className="text-[12px] uppercase tracking-[0.04em] text-signal-violet">Your target</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-black">
            Ask them to forgive about <strong className="font-normal text-signal-violet">half the bill</strong>.
            Offer a partial lump sum today in exchange for wiping the rest. Aim to walk away
            paying 50% or less.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-[20px] text-ink-black">Your game plan</h3>
        <ol className="mt-4 space-y-4">
          {GAME_PLAN.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-cards border border-fog-gray p-4">
              <span className="font-display font-light text-[28px] leading-none text-signal-violet">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-[15px] text-ink-black">{step.title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ash-gray">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-[20px] text-ink-black">
          Negotiation tactics{" "}
          <span className="text-[13px] font-normal text-slate-gray">
            — adapted from &ldquo;Never Split the Difference&rdquo; (Chris Voss)
          </span>
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TACTICS.map((t) => (
            <div key={t.title} className="rounded-cards border border-fog-gray border-l-2 border-l-signal-violet p-5">
              <p className="text-[15px] text-ink-black">
                {t.title}
                {t.label && <span className="ml-2 text-[11px] uppercase tracking-[0.04em] text-slate-gray">{t.label}</span>}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ash-gray">{t.why}</p>
              <div className="mt-3 rounded-inputs bg-fog-gray px-4 py-3">
                <p className="text-[10.5px] uppercase tracking-[0.04em] text-signal-violet">Try saying</p>
                <p className="mt-1 text-[13.5px] italic leading-relaxed text-ink-black">{t.say}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[12px] leading-relaxed text-slate-gray">
        General negotiation guidance, not legal or financial advice. You know your situation best.
      </p>
    </div>
  );
}
