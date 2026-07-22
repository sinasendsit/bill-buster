// No Surprises Act layer — the patient's strongest legal lever, applied deterministically.
//
// The federal patient-provider dispute resolution (PPDR) process lets an UNINSURED or
// self-pay patient force an independent review when their final bill lands at least
// $400 above the written good faith estimate they were given before treatment.
//
// Claude reads the documents and reports the raw facts (is this self-pay? what was
// billed? what did the estimate say?). Every eligibility decision below is made in
// plain code — we never let the model decide whether someone has a legal right.

export const PPDR_THRESHOLD = 400;   // bill must exceed the estimate by this much
export const PPDR_WINDOW_DAYS = 120; // days from the bill date to file
export const PPDR_FEE = 25;          // filing fee, credited back if you win

export const CMS_DISPUTE_URL = "https://www.cms.gov/medical-bill-rights/help/dispute-a-bill";
export const CMS_COMPLAINT_URL = "https://www.cms.gov/medical-bill-rights/help/submit-a-complaint";

export type DisputeStatus =
  | "eligible"        // self-pay + estimate + overage >= $400
  | "need_estimate"   // self-pay, but we haven't seen the good faith estimate
  | "below_threshold" // self-pay + estimate, but the gap is under $400
  | "insured";        // insurance was used — different protections apply

export interface NoSurprisesInfo {
  selfPay: boolean;
  status: DisputeStatus;
  headline: string;
  detail: string;
  billedTotal?: number;
  estimateTotal?: number;
  overage?: number;
  steps: string[];
  protections: string[];
  actionUrl: string;
}

/** Protections that kick in the moment a PPDR dispute is open. */
const DISPUTE_PROTECTIONS = [
  "Your cost cannot increase because you disputed.",
  "They cannot send this bill to collections while the dispute is open — and must stop pursuing you if it is already there.",
  "Late fees are frozen until the dispute is resolved.",
  "They cannot retaliate against you for disputing.",
  "If you settle directly before it ends, they must still cut at least $12.50 off the bill.",
];

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Decide, in code, what No Surprises Act rights apply to this bill.
 * Returns null only when there is nothing meaningful to say.
 */
export function assessNoSurprises(opts: {
  selfPay?: boolean | null;
  billedTotal?: number | null;
  estimateTotal?: number | null;
  documentType?: string | null;
}): NoSurprisesInfo | null {
  const { documentType } = opts;

  // An EOB/Medicare notice isn't a provider bill — the dispute process doesn't apply.
  if (documentType === "eob" || documentType === "msn") return null;

  const billedTotal =
    typeof opts.billedTotal === "number" && opts.billedTotal > 0 ? opts.billedTotal : undefined;
  const estimateTotal =
    typeof opts.estimateTotal === "number" && opts.estimateTotal > 0 ? opts.estimateTotal : undefined;

  // Insurance was used (or we can't see self-pay signals) → the PPDR route is closed,
  // but the balance-billing protections still matter.
  if (opts.selfPay !== true) {
    return {
      selfPay: false,
      status: "insured",
      headline: "You may still be protected from surprise out-of-network charges",
      detail:
        "The federal patient-provider dispute process is only for patients who paid without insurance. " +
        "But if you were billed out-of-network rates for emergency care, or for care at a facility that is in your network, " +
        "the No Surprises Act likely protects you — and you can file a complaint.",
      billedTotal,
      steps: [
        "Check whether any provider on this bill was out-of-network at an in-network facility, or was emergency care.",
        "If so, you should only owe your normal in-network cost sharing.",
        "File a complaint with the CMS No Surprises Help Desk if you were billed more.",
        "Separately, appeal through your insurer using the process in your plan documents and denial notice.",
      ],
      protections: [
        "You cannot be balance-billed for emergency care above in-network cost sharing.",
        "You cannot be balance-billed by an out-of-network provider at an in-network facility without valid advance notice and consent.",
        "Not meeting your deductible is NOT a violation — that part is normal cost sharing.",
      ],
      actionUrl: CMS_COMPLAINT_URL,
    };
  }

  // --- Self-pay / uninsured from here down ---

  if (estimateTotal === undefined) {
    return {
      selfPay: true,
      status: "need_estimate",
      headline: "You may have the right to force a federal review of this bill",
      detail:
        "This looks like a self-pay or uninsured bill. If your provider gave you a written good faith estimate before treatment " +
        `and this bill came in at least ${money(PPDR_THRESHOLD)} higher, you can make an independent reviewer decide a fair price. ` +
        "Upload that estimate and we will check the gap for you.",
      billedTotal,
      steps: [
        "Find the written good faith estimate you were given before the procedure.",
        "Upload it here — we will compare it against this bill automatically.",
        `If the gap is ${money(PPDR_THRESHOLD)} or more, you can file with CMS within ${PPDR_WINDOW_DAYS} days of the bill date.`,
        "Never got an estimate? Providers must give uninsured patients one — that itself is worth a complaint.",
      ],
      protections: DISPUTE_PROTECTIONS,
      actionUrl: CMS_DISPUTE_URL,
    };
  }

  const overage = billedTotal !== undefined ? Math.round((billedTotal - estimateTotal) * 100) / 100 : undefined;

  if (overage !== undefined && overage >= PPDR_THRESHOLD) {
    return {
      selfPay: true,
      status: "eligible",
      headline: `You qualify to dispute this bill — it is ${money(overage)} over your estimate`,
      detail:
        `You were quoted ${money(estimateTotal)} and billed ${money(billedTotal!)}. Because you paid without insurance and the bill ` +
        `exceeds your good faith estimate by at least ${money(PPDR_THRESHOLD)}, federal law lets you hand this to an independent ` +
        "reviewer who decides what the price should have been. Providers often reduce the bill rather than go through it.",
      billedTotal,
      estimateTotal,
      overage,
      steps: [
        `File the dispute at CMS within ${PPDR_WINDOW_DAYS} days of the date on this bill.`,
        `Pay the ${money(PPDR_FEE)} filing fee — it is credited off what you owe if the decision goes your way.`,
        "Submit this bill and your good faith estimate together.",
        "Keep paying nothing toward the disputed amount while it is under review — collections are frozen.",
      ],
      protections: DISPUTE_PROTECTIONS,
      actionUrl: CMS_DISPUTE_URL,
    };
  }

  return {
    selfPay: true,
    status: "below_threshold",
    headline: "This bill tracks close to your estimate",
    detail:
      `You were quoted ${money(estimateTotal)} and billed ${money(billedTotal ?? 0)}` +
      (overage !== undefined ? ` — a difference of ${money(Math.abs(overage))}. ` : ". ") +
      `The federal dispute process needs a gap of at least ${money(PPDR_THRESHOLD)}, so it is not open to you here. ` +
      "You can still negotiate the price directly and ask about financial assistance.",
    billedTotal,
    estimateTotal,
    overage,
    steps: [
      "Ask for an itemized bill and check every line against the estimate.",
      "Ask for the self-pay or prompt-pay discount — it is almost always available.",
      "Ask whether the hospital offers charity care or financial assistance.",
    ],
    protections: [
      "You can still request a full itemized bill — providers must supply one.",
      "You can still negotiate; list prices are set high on the assumption they will be negotiated down.",
    ],
    actionUrl: CMS_DISPUTE_URL,
  };
}
