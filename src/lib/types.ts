import type { NoSurprisesInfo } from "./noSurprises";
import type { MatchType } from "./codeDatabase";

export interface LineItem {
  code: string;
  codeType: "CPT" | "ICD" | "Revenue" | "Other";
  description: string;       // plain English translation
  chargedAmount: number;
  quantity?: number | null;   // units billed on this line — per-unit drug codes need it
  medicareRate?: number;      // benchmark for THIS LINE as billed (unit rate × quantity)
  medicareUnitRate?: number;  // per-unit benchmark, when the code is priced per unit
  medicareRateUnit?: string;  // what one unit is, e.g. "per 10 mg"
  codeVerified?: boolean;     // code recognized in BillBuster's reference DB
  codeCategory?: string;      // authoritative category from the reference DB
  codeName?: string;          // authoritative plain-language name from the reference DB
  codeNote?: string;          // patient-facing caveat (e.g. "Medicare bundles this")
  matchType?: MatchType;      // how confidently the code was recognized
  resolvedCode?: string;      // the real code we resolved to, if different from `code`
  rateSource?: "benchmark" | "estimated"; // where medicareRate came from
  flags: Flag[];
}

export interface Flag {
  type: "duplicate" | "unbundling" | "severity_mismatch" | "unrelated" | "price_outlier" | "info";
  severity: "red" | "yellow" | "green";
  message: string;            // plain English explanation
}

export type DocumentType =
  | "itemized_statement"
  | "ub04_claim"
  | "cms1500_claim"
  | "eob"
  | "msn"
  | "summary_bill"
  | "other";

/**
 * One document inside a multi-document packet. A single uploaded PDF often staples
 * together a hospital bill + an insurance EOB + a denial letter; treating the whole
 * thing as one document (usually the first page, an EOB) is what made the engine
 * report a $0 total and drop the patient's rights. We now itemize the packet.
 */
export interface DocumentInfo {
  type: DocumentType;
  label: string;                        // e.g. "Hospital itemized statement", "Cigna EOB"
  totalCharged?: number | null;         // gross provider charges on THIS document
  patientResponsibility?: number | null; // what THIS document says the patient owes
}

export interface BillAnalysis {
  patientName?: string;
  facilityName?: string;
  serviceDate?: string;
  documentType?: DocumentType; // the PRIMARY (most informative bill) document in the packet
  documents?: DocumentInfo[]; // every document found, when the upload is a multi-doc packet
  coverageWarning?: string;   // set when the analysis is partial (missing pages etc.)
  selfPay?: boolean | null;   // paid without insurance (unlocks the federal dispute)
  billDate?: string;          // statement date, distinct from the service date
  estimateTotal?: number | null; // total from an uploaded good faith estimate
  noSurprises?: NoSurprisesInfo | null; // computed in code, never by the model
  totalCharged: number;
  lineItems: LineItem[];
  summary: string;            // 2-3 sentence plain English summary
  topIssues: string[];        // the 3-5 biggest problems found
}
