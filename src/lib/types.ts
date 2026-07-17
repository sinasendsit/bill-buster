export interface LineItem {
  code: string;
  codeType: "CPT" | "ICD" | "Revenue" | "Other";
  description: string;       // plain English translation
  chargedAmount: number;
  medicareRate?: number;      // benchmark for comparison
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

export interface BillAnalysis {
  patientName?: string;
  facilityName?: string;
  serviceDate?: string;
  documentType?: DocumentType;
  coverageWarning?: string;   // set when the analysis is partial (missing pages etc.)
  totalCharged: number;
  lineItems: LineItem[];
  summary: string;            // 2-3 sentence plain English summary
  topIssues: string[];        // the 3-5 biggest problems found
}
