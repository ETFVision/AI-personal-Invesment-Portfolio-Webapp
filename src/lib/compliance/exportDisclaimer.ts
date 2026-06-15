import { EXPORT_REPORT_DISCLAIMER_TEXT } from "@/lib/compliance/disclaimers";

// TODO: LAUNCH BLOCKER — wire exportDisclaimer into PDF/CSV generators
// Helpers ready at src/lib/compliance/exportDisclaimer.ts
export function appendCsvDisclaimer(csvContent: string) {
  const trimmedContent = csvContent.endsWith("\n") ? csvContent : `${csvContent}\n`;
  return `${trimmedContent}\n"Disclaimer","${EXPORT_REPORT_DISCLAIMER_TEXT.replaceAll('"', '""')}"\n`;
}

export function reportDisclaimerFooter() {
  return EXPORT_REPORT_DISCLAIMER_TEXT;
}
