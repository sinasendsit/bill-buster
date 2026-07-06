export interface LineItem {
  code: string;
  codeType: "CPT" | "ICD" | "Revenue" | "Other";
  description: string;       // plain English translation
  chargedAmount: number;
  medicareRate?: number;      // benchmark for comparison
  flags: Flag[];
}

export interface Flag {
  type: "duplicate" | "severity_mismatch" | "unrelated" | "price_outlier" | "info";
  severity: "red" | "yellow" | "green";
  message: string;            // plain English explanation
}

export interface BillAnalysis {
  patientName?: string;
  facilityName?: string;
  serviceDate?: string;
  totalCharged: number;
  lineItems: LineItem[];
  summary: string;            // 2-3 sentence plain English summary
  topIssues: string[];        // the 3-5 biggest problems found
}
