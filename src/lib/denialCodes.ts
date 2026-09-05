// Denial / remark code dictionary — gap #7.
//
// The Jones case turned on two codes ("D3" and "A1") that nobody translated into plain
// English. The model can read the codes printed on an EOB/MSN, but — same pattern as
// noSurprises.ts — it must never be trusted to decide what they MEAN or whether they
// represent a dispute opportunity. That judgment lives here, in deterministic code,
// against the published X12 Claim Adjustment Reason Code (CARC) and Remittance Advice
// Remark Code (RARC) lists.
//
// Only codes we are confident about are included. When we aren't sure of a code's real
// meaning we leave it out rather than guess — a wrong "plain English" translation of a
// denial reason is worse than no translation at all.

/** Claim Adjustment Group Codes — who is on the hook for this adjustment. */
export type GroupCode = "CO" | "PR" | "OA" | "PI" | "CR";

export type DenialSystem = "CARC" | "RARC" | "group" | "payer";

/** One dictionary entry — the deterministic, patient-facing translation of a code. */
export interface DenialEntry {
  system: DenialSystem;
  meaning: string; // plain English, one sentence, patient-facing
  whatToDo: string; // one concrete next step
  /** True for the subset of codes that represent a real dispute/appeal opportunity for the patient. */
  actionable?: boolean;
}

/** A denial/adjustment code as extracted (raw facts only) from an EOB/MSN by the model. */
export interface ExtractedCode {
  code: string; // as printed, e.g. "CO-45", "45", "N130", "D3"
  lineItemIndex?: number | null; // index into lineItems, when the code was attached to a line
  printedDefinition?: string | null; // the EOB's own printed definition, if it prints a code key/legend
}

/** The decoded, patient-facing result attached to the analysis — matches the frontend contract. */
export interface Denial {
  code: string;
  system: DenialSystem;
  meaning: string;
  whatToDo: string;
  lineItemIndex?: number;
}

// ---------------------------------------------------------------------------
// Claim Adjustment Group Codes
// ---------------------------------------------------------------------------

export const GROUP_CODES: Record<GroupCode, DenialEntry> = {
  CO: {
    system: "group",
    meaning:
      "The provider agreed to this write-off under their contract with your insurer — you generally cannot be billed for it.",
    whatToDo:
      "If your provider bills you for this amount anyway, point them to the CO code and ask them to remove it; contractual write-offs are not the patient's responsibility.",
  },
  PR: {
    system: "group",
    meaning:
      "This portion is your responsibility under your plan — typically a deductible, copay, or coinsurance amount.",
    whatToDo:
      "Check this against your plan's stated deductible/copay/coinsurance; if it looks too high, call your insurer and ask them to show the math.",
  },
  OA: {
    system: "group",
    meaning:
      "An adjustment your insurer applied that isn't a standard contractual write-off or your normal cost-sharing — often coordination of benefits with another plan.",
    whatToDo:
      "Ask your insurer to explain this specific adjustment in writing, and check whether another insurance plan should have paid first.",
  },
  PI: {
    system: "group",
    meaning:
      "A reduction your insurer applied on its own — not because of your contract or your cost-sharing.",
    whatToDo:
      "Ask your insurer for the specific reason behind this reduction; you can request a written explanation and appeal if it seems wrong.",
  },
  CR: {
    system: "group",
    meaning: "A correction or reversal of a previous claim adjustment.",
    whatToDo:
      "Compare this EOB to the earlier one it corrects to see exactly what changed and why.",
  },
};

// ---------------------------------------------------------------------------
// CARC — Claim Adjustment Reason Codes
// ---------------------------------------------------------------------------

export const CARC_CODES: Record<string, DenialEntry> = {
  "1": {
    system: "CARC",
    meaning: "This amount was applied to your plan's deductible — what you pay before insurance starts covering costs.",
    whatToDo: "Check your plan's deductible balance (on your insurer's website or app) to confirm this is accurate.",
  },
  "2": {
    system: "CARC",
    meaning: "This is your coinsurance — the percentage of the cost you share after your deductible is met.",
    whatToDo: "Confirm the percentage matches your plan's stated coinsurance rate for this type of service.",
  },
  "3": {
    system: "CARC",
    meaning: "This is your fixed copay for this type of visit or service.",
    whatToDo: "Check your plan's copay schedule (on your insurance card or plan documents) to confirm the amount.",
  },
  "4": {
    system: "CARC",
    meaning: "The insurer says the billing code and its modifier don't match, or a required modifier is missing.",
    whatToDo: "Ask your provider's billing office to review the code and modifier and resubmit — this is a billing fix, not something you should owe yet.",
  },
  "16": {
    system: "CARC",
    meaning: "The claim was missing information or had an error the insurer needs before it can process it.",
    whatToDo: "Ask your provider's billing office what information was missing and to resubmit — you shouldn't owe anything until it's fixed.",
  },
  "18": {
    system: "CARC",
    meaning: "This charge was submitted twice for the same service; the insurer denied the duplicate copy.",
    whatToDo: "If you're billed for this line twice, ask your provider to remove the duplicate — you should only be responsible for it once.",
  },
  "22": {
    system: "CARC",
    meaning: "Your insurer thinks another insurance plan may be responsible for paying this first.",
    whatToDo: "Confirm with your insurer which plan is primary, and make sure your coordination-of-benefits information is current.",
  },
  "23": {
    system: "CARC",
    meaning: "Another insurer already processed this claim, and this payment reflects what's left over after that.",
    whatToDo: "Compare this EOB with the one from your other insurance plan to make sure the numbers line up.",
  },
  "26": {
    system: "CARC",
    meaning: "The insurer says this service happened before your coverage started.",
    whatToDo: "If your coverage actually started earlier, call your insurer with your enrollment paperwork and ask them to correct the coverage date.",
  },
  "27": {
    system: "CARC",
    meaning: "The insurer says this service happened after your coverage ended.",
    whatToDo: "If you believe your coverage was still active on this date, send your insurer proof (pay stub, COBRA letter) and ask them to reprocess the claim.",
  },
  "29": {
    system: "CARC",
    meaning: "The insurer says this claim was submitted too late to be paid (timely filing).",
    whatToDo: "This is almost always the provider's fault, not yours — ask your provider to appeal the timely-filing denial or write off the balance; you should not be billed for a provider's late filing.",
    actionable: true,
  },
  "31": {
    system: "CARC",
    meaning: "The insurer couldn't match this claim to your coverage — often a wrong member ID or name.",
    whatToDo: "Double-check the member ID and name on your insurance card match what was billed, then ask your provider to correct and resubmit.",
  },
  "45": {
    system: "CARC",
    meaning: "The charge was higher than the maximum amount your plan allows for this provider; you should generally owe only up to the allowed amount, not the difference.",
    whatToDo: "If your provider bills you the difference (balance billing) and they're in-network, dispute it — ask your insurer to confirm the contracted rate and tell your provider you're not responsible for the excess.",
    actionable: true,
  },
  "50": {
    system: "CARC",
    meaning: "The insurer decided this service didn't meet its medical necessity criteria and won't pay for it.",
    whatToDo: "Ask your doctor's office for a letter of medical necessity and file an appeal with your insurer — medical-necessity denials are frequently overturned on appeal.",
    actionable: true,
  },
  "51": {
    system: "CARC",
    meaning: "The insurer denied this because it considers the condition pre-existing.",
    whatToDo: "Most plans can no longer exclude pre-existing conditions — ask your insurer to cite the specific policy provision and consider appealing.",
    actionable: true,
  },
  "54": {
    system: "CARC",
    meaning: "The insurer won't pay multiple providers for what it considers the same service.",
    whatToDo: "Ask each provider's office to clarify their distinct role in your care and resubmit with documentation if warranted.",
  },
  "55": {
    system: "CARC",
    meaning: "The insurer denied this because it classifies the treatment as experimental or investigational.",
    whatToDo: "Ask your doctor for supporting medical literature and file an appeal — this is one of the most commonly overturned denial reasons.",
    actionable: true,
  },
  "56": {
    system: "CARC",
    meaning: "The insurer says this treatment hasn't been proven effective for your condition.",
    whatToDo: "Ask your doctor to submit clinical evidence supporting the treatment, then file an appeal.",
    actionable: true,
  },
  "58": {
    system: "CARC",
    meaning: "The insurer says this service shouldn't have been billed from this type of location.",
    whatToDo: "Ask your provider's billing office to confirm the place-of-service code is correct and resubmit if not.",
  },
  "59": {
    system: "CARC",
    meaning: "Payment was adjusted because of rules about performing multiple procedures at the same time.",
    whatToDo: "Ask your provider's billing office to walk you through which procedures were bundled and why.",
  },
  "60": {
    system: "CARC",
    meaning: "The insurer bundled this outpatient charge into a nearby inpatient stay instead of paying it separately.",
    whatToDo: "Ask your provider's billing office to confirm the dates and explain the bundling.",
  },
  "65": {
    system: "CARC",
    meaning: "The insurer says the billed procedure code was incorrect.",
    whatToDo: "Ask your provider to correct the code and resubmit — you shouldn't owe anything until it's fixed.",
  },
  "66": {
    system: "CARC",
    meaning: "This reflects the first several units of blood, which many plans require you to replace or pay for.",
    whatToDo: "Ask your plan whether it has a blood-deductible provision and whether donating replacement blood can offset the cost.",
  },
  "69": {
    system: "CARC",
    meaning: "An adjustment for an unusually long hospital stay under the payer's outlier payment rules.",
    whatToDo: "Ask the billing office whether this outlier adjustment changes what you personally owe.",
  },
  "70": {
    system: "CARC",
    meaning: "An adjustment for an unusually high-cost stay under the payer's outlier payment rules.",
    whatToDo: "Ask the billing office whether this outlier adjustment changes what you personally owe.",
  },
  "74": {
    system: "CARC",
    meaning: "An adjustment tied to the hospital's teaching-hospital funding, not something specific to your care.",
    whatToDo: "This shouldn't affect what you owe — flag it if it appears inside your patient-responsibility total.",
  },
  "78": {
    system: "CARC",
    meaning: "The insurer won't cover certain days of your room charge.",
    whatToDo: "Ask why the specific days were excluded and check the admission/discharge dates for accuracy.",
  },
  "85": {
    system: "CARC",
    meaning: "This is interest charged to you on a past-due balance.",
    whatToDo: "Ask if the interest can be waived, especially if the delay was caused by a billing dispute.",
  },
  "89": {
    system: "CARC",
    meaning: "Professional (physician) fees were separated out of this charge and billed separately.",
    whatToDo: "Make sure you're not billed twice for the same service by both the facility and the physician.",
  },
  "96": {
    system: "CARC",
    meaning: "Your plan does not cover this service or item at all.",
    whatToDo: "Check your plan's coverage document; if you believe it should be covered, file an appeal with your insurer.",
    actionable: true,
  },
  "97": {
    system: "CARC",
    meaning: "The insurer says this charge is already included in the payment for another service billed the same day, so it won't pay it separately.",
    whatToDo: "Ask your provider's billing office what it was bundled into — you generally shouldn't be billed for it separately.",
    actionable: true,
  },
  "100": {
    system: "CARC",
    meaning: "The insurer paid you directly instead of the provider.",
    whatToDo: "If you received this payment, forward it to your provider to settle the bill.",
  },
  "101": {
    system: "CARC",
    meaning: "This is an estimate of what would be paid, not a final payment decision.",
    whatToDo: "Nothing to pay yet — wait for the final claim decision.",
  },
  "107": {
    system: "CARC",
    meaning: "The insurer denied this because of another related procedure billed on the same or a related date.",
    whatToDo: "Ask your provider's billing office which related charge caused this denial.",
  },
  "109": {
    system: "CARC",
    meaning: "This insurer says it isn't the right payer for this claim — it may have been sent to the wrong insurance company.",
    whatToDo: "Confirm with your provider which insurance was active on the date of service and ask them to resubmit to the correct payer — you shouldn't be billed while this is sorted out.",
    actionable: true,
  },
  "110": {
    system: "CARC",
    meaning: "The bill was dated before the actual date of service, which the insurer's system flagged as an error.",
    whatToDo: "Ask your provider's billing office to correct the date and resubmit.",
  },
  "111": {
    system: "CARC",
    meaning: "This is only payable if your provider agrees to accept the insurer's approved amount as full payment.",
    whatToDo: "Ask your provider whether they accept assignment for your plan.",
  },
  "112": {
    system: "CARC",
    meaning: "The insurer's records don't show this service being provided directly to you.",
    whatToDo: "Ask your provider's billing office to clarify and provide documentation if this is an error.",
  },
  "114": {
    system: "CARC",
    meaning: "The insurer denied this because the treatment isn't FDA-approved for this use.",
    whatToDo: "Ask your doctor about FDA approval status and whether an appeal citing off-label use guidelines is possible.",
  },
  "115": {
    system: "CARC",
    meaning: "The insurer's records show this procedure was postponed, canceled, or delayed.",
    whatToDo: "If the procedure did happen, ask your provider to correct the claim and resubmit.",
  },
  "116": {
    system: "CARC",
    meaning: "You've reached the maximum number of times this service is covered for the stated period.",
    whatToDo: "Check your plan documents for the exact limit; if you believe it's miscounted, request a claims history from your insurer and appeal.",
  },
  "117": {
    system: "CARC",
    meaning: "Your plan doesn't cover this transportation service (e.g., non-emergency ambulance).",
    whatToDo: "Check your plan for transportation benefits and ask about a medical-necessity appeal if the trip was medically required.",
  },
  "119": {
    system: "CARC",
    meaning: "You've used up your plan's benefit allowance for this service in the current period.",
    whatToDo: "Check your plan's benefit limits and dates; if the insurer miscounted your usage, request a claims history and appeal.",
    actionable: true,
  },
  "121": {
    system: "CARC",
    meaning: "An adjustment tied to a legal indemnification agreement, not your normal cost-sharing.",
    whatToDo: "Ask your insurer to explain this adjustment in plain terms.",
  },
  "131": {
    system: "CARC",
    meaning: "A one-time negotiated discount was applied to this claim.",
    whatToDo: "This usually lowers what you owe — confirm the discounted amount is reflected on your bill.",
  },
  "140": {
    system: "CARC",
    meaning: "The patient ID or name on the claim didn't match your insurer's records.",
    whatToDo: "Check that your insurance card's ID number and the spelling of your name match what your provider billed, then ask them to correct and resubmit.",
  },
  "146": {
    system: "CARC",
    meaning: "The insurer says this diagnosis doesn't match the type of provider who billed it.",
    whatToDo: "Ask your provider's billing office to review the diagnosis and provider-type codes.",
  },
  "147": {
    system: "CARC",
    meaning: "The insurer says the provider's contracted rate had expired for this date of service.",
    whatToDo: "Ask your provider's billing office to confirm their network contract status on the date of service.",
  },
  "149": {
    system: "CARC",
    meaning: "You've reached the lifetime maximum for this benefit category.",
    whatToDo: "Many lifetime limits on essential health benefits are no longer legal under federal law — ask your insurer to cite the rule and consider appealing.",
    actionable: true,
  },
  "150": {
    system: "CARC",
    meaning: "The insurer says the documentation doesn't justify the complexity or level of the visit billed.",
    whatToDo: "Ask your provider to submit additional clinical documentation supporting the visit level.",
  },
  "151": {
    system: "CARC",
    meaning: "The insurer says the documentation doesn't justify how often this service was provided.",
    whatToDo: "Ask your provider to submit documentation supporting the frequency of treatment.",
  },
  "158": {
    system: "CARC",
    meaning: "The diagnosis code submitted was invalid.",
    whatToDo: "Ask your provider's billing office to correct the diagnosis code and resubmit.",
  },
  "167": {
    system: "CARC",
    meaning: "Your plan doesn't cover services for this diagnosis.",
    whatToDo: "Check your plan's exclusions and consider an appeal if you believe the diagnosis should be covered.",
  },
  "170": {
    system: "CARC",
    meaning: "Your plan doesn't pay this type of provider for this service.",
    whatToDo: "Ask whether a different, covered provider type needs to bill this instead.",
  },
  "177": {
    system: "CARC",
    meaning: "The insurer's records show you weren't eligible for coverage on the date of service.",
    whatToDo: "If you believe you were covered, send your insurer proof of enrollment for that date and ask them to reprocess the claim.",
    actionable: true,
  },
  "178": {
    system: "CARC",
    meaning: "The insurer's records show you weren't enrolled in this specific plan on the date of service.",
    whatToDo: "Check your enrollment effective dates and dispute with your insurer if they have the wrong date on file.",
  },
  "181": {
    system: "CARC",
    meaning: "The procedure code billed wasn't valid on the date of service.",
    whatToDo: "Ask your provider's billing office to correct the code and resubmit.",
  },
  "185": {
    system: "CARC",
    meaning: "The specific provider who performed the service isn't eligible or enrolled with this payer.",
    whatToDo: "Ask the practice's billing office to confirm the provider's enrollment status — this is not your error to fix.",
  },
  "197": {
    system: "CARC",
    meaning: "Your insurer says the required prior authorization wasn't obtained before this service.",
    whatToDo: "Ask your provider whether they were responsible for getting authorization — if so, this is often the provider's error, and you can dispute being billed for it while they appeal.",
    actionable: true,
  },
  "198": {
    system: "CARC",
    meaning: "The service went beyond what was authorized (e.g., more visits or units than approved).",
    whatToDo: "Ask your provider why the authorized amount was exceeded and whether they can request a retroactive extension.",
  },
  "199": {
    system: "CARC",
    meaning: "The revenue code and procedure code on the claim don't match up.",
    whatToDo: "Ask your provider's billing office to correct the coding and resubmit.",
  },
  "200": {
    system: "CARC",
    meaning: "The insurer says there was a gap in your coverage on this date.",
    whatToDo: "If you believe your coverage was continuous, send proof to your insurer and ask them to correct their records.",
  },
  "204": {
    system: "CARC",
    meaning: "This specific service, equipment, or drug isn't covered under your current benefit plan.",
    whatToDo: "Check your plan's formulary or coverage document; if you believe it should be covered, file an appeal.",
    actionable: true,
  },
  "222": {
    system: "CARC",
    meaning: "You've exceeded the maximum units, hours, or days allowed for this service.",
    whatToDo: "Check your plan's limits and ask your insurer for a usage history if the count seems wrong.",
  },
  "226": {
    system: "CARC",
    meaning: "The insurer asked your provider for more information and didn't receive it.",
    whatToDo: "Contact your provider's billing office and ask them to respond to the insurer's request — you shouldn't be billed while this is pending.",
  },
  "227": {
    system: "CARC",
    meaning: "The insurer asked a different provider involved in your care for information and didn't get it.",
    whatToDo: "Ask your care team which provider still owes the insurer information.",
  },
  "229": {
    system: "CARC",
    meaning: "Only part of this charge was included in the insurer's review.",
    whatToDo: "Ask your provider's billing office for a full breakdown of what was and wasn't submitted.",
  },
  "231": {
    system: "CARC",
    meaning: "The insurer won't pay for two procedures it considers mutually exclusive when done the same day.",
    whatToDo: "Ask your provider's billing office to clarify why both were billed and whether one should be resubmitted differently.",
  },
  "242": {
    system: "CARC",
    meaning: "This provider isn't in your insurance plan's network, so a different — usually lower — payment rate applies.",
    whatToDo: "If this was emergency care or you didn't knowingly choose an out-of-network provider, you may be protected by the No Surprises Act — dispute any balance bill above your in-network cost-sharing.",
    actionable: true,
  },
  "243": {
    system: "CARC",
    meaning: "The insurer says this service wasn't authorized through your network or primary care provider as your plan requires.",
    whatToDo: "Check whether your plan required a referral, and ask your PCP's office to submit one retroactively if the care was appropriate.",
  },
  "252": {
    system: "CARC",
    meaning: "The insurer needs additional documentation (like medical records) before it will pay this claim.",
    whatToDo: "Ask your provider's billing office to send the requested documentation — the claim can often be reprocessed once it's received.",
    actionable: true,
  },
  "253": {
    system: "CARC",
    meaning: "A federal budget rule (sequestration) reduced this Medicare payment slightly — it does not increase what you owe.",
    whatToDo: "This shouldn't be passed on to you; check that it wasn't folded into your patient-responsibility amount.",
  },
  "261": {
    system: "CARC",
    meaning: "This claim covers a service period spanning more than one month, processed together.",
    whatToDo: "Ask your provider's billing office if you have questions about how the dates were split.",
  },
  "272": {
    system: "CARC",
    meaning: "The insurer says this service didn't meet its specific coverage guidelines.",
    whatToDo: "Ask your insurer exactly which guideline wasn't met and whether you can appeal with more documentation.",
  },
  B7: {
    system: "CARC",
    meaning: "The insurer says your provider wasn't certified or eligible to bill this plan on the date of service.",
    whatToDo: "This is generally the provider's enrollment issue, not yours — ask the billing office to resolve it with the insurer before you pay anything.",
    actionable: true,
  },
};

// ---------------------------------------------------------------------------
// RARC — Remittance Advice Remark Codes (N-codes, M-codes, MA-codes)
// ---------------------------------------------------------------------------

export const RARC_CODES: Record<string, DenialEntry> = {
  N30: {
    system: "RARC",
    meaning: "The insurer says you weren't eligible for this specific service.",
    whatToDo: "Ask your insurer why, and check your plan's coverage document for this service.",
  },
  N54: {
    system: "RARC",
    meaning: "The claim doesn't match the services that were pre-certified or authorized.",
    whatToDo: "Ask your provider's billing office to confirm the authorized services match what was billed.",
  },
  N56: {
    system: "RARC",
    meaning: "The procedure code billed isn't correct or valid for the service or date of service.",
    whatToDo: "Ask your provider's billing office to correct the code and resubmit.",
  },
  N65: {
    system: "RARC",
    meaning: "The procedure code or rate couldn't be determined, or wasn't on file with the insurer.",
    whatToDo: "Ask your provider's billing office to verify the code against the insurer's fee schedule and resubmit.",
  },
  N70: {
    system: "RARC",
    meaning: "This service falls under consolidated billing, so it's paid as part of a bundled arrangement (common for skilled nursing stays).",
    whatToDo: "Ask the facility whether this charge is covered under the consolidated billing arrangement already.",
  },
  N95: {
    system: "RARC",
    meaning: "This type of provider isn't allowed to bill for this specific service under your plan.",
    whatToDo: "Ask whether a different, eligible provider needs to bill for this service instead.",
  },
  N130: {
    system: "RARC",
    meaning: "The insurer says you should consult your plan's benefit documents for restrictions on this service.",
    whatToDo: "Look up this service in your plan's benefit booklet, or call your insurer and ask them to read you the specific restriction that applied here.",
  },
  N179: {
    system: "RARC",
    meaning: "The insurer is waiting on additional information from another provider before deciding this claim.",
    whatToDo: "Ask your care team which other provider still owes the insurer information, and follow up with them directly.",
  },
  N180: {
    system: "RARC",
    meaning: "This item or service doesn't meet the criteria for the billing category it was submitted under.",
    whatToDo: "Ask your provider's billing office whether it should be resubmitted under a different code or category.",
  },
  N181: {
    system: "RARC",
    meaning: "The insurer needs additional information from another provider involved in this service.",
    whatToDo: "Ask your care team which provider needs to respond to the insurer's request.",
  },
  N182: {
    system: "RARC",
    meaning: "This claim isn't payable in the geographic area this insurer covers.",
    whatToDo: "Confirm with your provider and insurer that the claim was sent to the right regional plan.",
  },
  N210: {
    system: "RARC",
    meaning: "The insurer is telling you that you have the right to appeal this decision.",
    whatToDo: "Look for the appeal deadline and address printed elsewhere on this EOB and file your appeal before it passes.",
    actionable: true,
  },
  N362: {
    system: "RARC",
    meaning: "The number of days or units billed exceeds what the insurer considers an acceptable maximum.",
    whatToDo: "Ask your provider's billing office to double-check the quantity billed against your treatment record.",
  },
  N381: {
    system: "RARC",
    meaning: "The insurer says you should check your plan documents for prior authorization or notification requirements on this service.",
    whatToDo: "Ask your insurer or provider whether prior authorization was required and, if so, whether it was obtained.",
  },
  N386: {
    system: "RARC",
    meaning: "This decision was based on a national Medicare coverage policy for this service.",
    whatToDo: "Ask your provider whether an exception process applies to this national coverage rule.",
  },
  N418: {
    system: "RARC",
    meaning: "This claim was sent to the wrong payer.",
    whatToDo: "Ask your provider to confirm your correct insurance information and resubmit to the right payer.",
    actionable: true,
  },
  N425: {
    system: "RARC",
    meaning: "This service is excluded from coverage by law/statute for this program.",
    whatToDo: "Ask your insurer to point to the specific statutory exclusion — some patients qualify for an exception.",
  },
  N522: {
    system: "RARC",
    meaning: "This is a duplicate of a claim already processed (or being processed) as a crossover claim between two payers.",
    whatToDo: "Compare this EOB against the one from your other insurance plan to confirm it's the same claim.",
  },
  M15: {
    system: "RARC",
    meaning: "This charge was bundled with another service billed the same day because the insurer considers it a component of that service.",
    whatToDo: "Ask your provider's billing office what it was bundled into — you generally shouldn't be billed for it separately.",
    actionable: true,
  },
  M16: {
    system: "RARC",
    meaning: "The insurer is pointing you to its own published policy for more detail on this decision.",
    whatToDo: "Ask your insurer directly for the specific policy bulletin referenced, in plain language.",
  },
  M25: {
    system: "RARC",
    meaning: "The information submitted doesn't support the additional charges billed.",
    whatToDo: "Ask your provider to submit further documentation supporting the charge and resubmit.",
  },
  M27: {
    system: "RARC",
    meaning: "You have been relieved of responsibility for paying this charge under a limitation-of-liability rule.",
    whatToDo: "If you're billed for this anyway, point the provider to this code — you should not owe it.",
    actionable: true,
  },
  M51: {
    system: "RARC",
    meaning: "The procedure code on the claim is missing, incomplete, or invalid.",
    whatToDo: "Ask your provider's billing office to correct the code and resubmit.",
  },
  M76: {
    system: "RARC",
    meaning: "The diagnosis or condition code on the claim is missing, incomplete, or invalid.",
    whatToDo: "Ask your provider's billing office to correct the diagnosis code and resubmit.",
  },
  M80: {
    system: "RARC",
    meaning: "This isn't covered because it was performed during the same visit or date as another service already processed for you.",
    whatToDo: "Ask your provider's billing office to explain the overlap and whether it should be billed differently.",
  },
  M86: {
    system: "RARC",
    meaning: "This was denied because the same or a similar procedure was already paid for within the allowed time frame.",
    whatToDo: "Ask your provider's billing office to confirm the dates of the prior service and whether this one was medically necessary in addition.",
  },
  MA01: {
    system: "RARC",
    meaning: "The insurer is reminding you that you can appeal if you disagree with what was approved.",
    whatToDo: "Look for the appeal instructions and deadline printed on this notice.",
    actionable: true,
  },
  MA04: {
    system: "RARC",
    meaning: "The insurer can't finish processing this as a secondary claim without payment information from your primary insurer.",
    whatToDo: "Ask your provider to submit the primary insurer's EOB along with this claim.",
  },
  MA07: {
    system: "RARC",
    meaning: "This claim information was also sent to Medicaid for review.",
    whatToDo: "Watch for a separate notice from Medicaid about this same claim.",
  },
  MA13: {
    system: "RARC",
    meaning: "The insurer is warning your provider that billing you for amounts not reported on this claim could violate the rules.",
    whatToDo: "If you're billed for something not shown on this EOB, point the provider to this code.",
    actionable: true,
  },
  MA15: {
    system: "RARC",
    meaning: "Your claim was split so part of it could be processed faster; the rest will come in a separate notice.",
    whatToDo: "Expect a second EOB for the remaining services — don't assume they were denied.",
  },
  MA18: {
    system: "RARC",
    meaning: "This claim information was also forwarded to your supplemental insurance plan.",
    whatToDo: "Watch for a follow-up EOB from your supplemental insurer.",
  },
  MA61: {
    system: "RARC",
    meaning: "Your Social Security number or health insurance claim number is missing, incomplete, or invalid on this claim.",
    whatToDo: "Ask your provider's billing office to correct your ID information and resubmit.",
  },
  MA63: {
    system: "RARC",
    meaning: "The main diagnosis code on this claim is missing, incomplete, or invalid.",
    whatToDo: "Ask your provider's billing office to correct the diagnosis code and resubmit.",
  },
  MA66: {
    system: "RARC",
    meaning: "The main procedure code on this claim is missing, incomplete, or invalid.",
    whatToDo: "Ask your provider's billing office to correct the procedure code and resubmit.",
  },
  MA92: {
    system: "RARC",
    meaning: "The insurer is missing information about your other insurance coverage.",
    whatToDo: "Give your provider and insurer your complete, current insurance information so the claim can be reprocessed.",
  },
  MA130: {
    system: "RARC",
    meaning: "This claim had incomplete or invalid information and could not be processed at all — it isn't a real denial, and you have no appeal rights on it as submitted.",
    whatToDo: "Ask your provider to correct the claim and submit it again as a new claim.",
    actionable: true,
  },
};

// ---------------------------------------------------------------------------
// Lookup / normalization
// ---------------------------------------------------------------------------

const GROUP_PREFIXES: readonly GroupCode[] = ["CO", "PR", "OA", "PI", "CR"];

function isGroupCode(s: string): s is GroupCode {
  return (GROUP_PREFIXES as readonly string[]).includes(s);
}

function genericPayerEntry(printedDefinition?: string | null): DenialEntry {
  const trimmedDef = printedDefinition?.trim();
  if (trimmedDef) {
    return {
      system: "payer",
      meaning: trimmedDef,
      whatToDo:
        "Check this EOB for your appeal deadline and follow the instructions printed there — if none are printed, call the number on the back of your insurance card and ask how to appeal this specific code.",
    };
  }
  return {
    system: "payer",
    meaning: "Insurer-specific code — check the code key printed on your EOB (usually the last page).",
    whatToDo:
      "Look for the code legend on your EOB (often the last page) and note your appeal deadline — if you can't find either, call the number on the back of your insurance card.",
  };
}

/**
 * Normalize and decode a raw denial/adjustment code as printed on an EOB/MSN.
 * "CO-45", "CO45", "45" all resolve to group CO + CARC 45. "N130" resolves to RARC.
 * Anything we don't recognize resolves to a safe "payer" entry rather than guessing —
 * using the EOB's own printed definition when the model captured one.
 */
export function decodeDenialCode(raw: string, printedDefinition?: string | null): DenialEntry | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase().replace(/\s+/g, "");

  try {
    // "CO-45" / "CO45" / "PR-1" — group prefix + CARC reason code
    const groupMatch = upper.match(/^(CO|PR|OA|PI|CR)-?([A-Z]?\d{1,3})$/);
    if (groupMatch) {
      const [, , reasonCode] = groupMatch;
      const carc = CARC_CODES[reasonCode];
      if (carc) return carc;
      // Recognized group but unrecognized reason code — fall through to payer-generic
      // rather than guessing at what the numeric part means.
      return genericPayerEntry(printedDefinition);
    }

    // Bare group code alone, e.g. "CO"
    if (isGroupCode(upper)) {
      return GROUP_CODES[upper];
    }

    // Bare CARC reason code, e.g. "45" or "B7"
    if (/^[A-Z]?\d{1,3}$/.test(upper)) {
      const carc = CARC_CODES[upper];
      if (carc) return carc;
    }

    // RARC: N-codes and M-codes (MA-codes are a distinct M-series with two letters)
    if (/^MA\d{1,3}$/.test(upper) || /^[NM]\d{1,4}$/.test(upper)) {
      const rarc = RARC_CODES[upper];
      if (rarc) return rarc;
    }

    // Unknown / payer-defined shorthand (e.g. "D3", "A1")
    return genericPayerEntry(printedDefinition);
  } catch {
    // Never throw on malformed input — degrade to the safe generic entry.
    return genericPayerEntry(printedDefinition);
  }
}

/** Decode every extracted adjustment code into the patient-facing shape the frontend expects. */
export function decodeAll(codes: ExtractedCode[] | null | undefined): Denial[] {
  if (!Array.isArray(codes)) return [];
  const out: Denial[] = [];
  for (const c of codes) {
    if (!c || typeof c.code !== "string" || !c.code.trim()) continue;
    let entry: DenialEntry | null;
    try {
      entry = decodeDenialCode(c.code, c.printedDefinition ?? undefined);
    } catch {
      entry = null;
    }
    if (!entry) continue;
    const denial: Denial = {
      code: c.code,
      system: entry.system,
      meaning: entry.meaning,
      whatToDo: entry.whatToDo,
    };
    if (typeof c.lineItemIndex === "number") denial.lineItemIndex = c.lineItemIndex;
    out.push(denial);
  }
  return out;
}
