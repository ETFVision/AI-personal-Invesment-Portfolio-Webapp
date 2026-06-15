import { EXPORT_REPORT_DISCLAIMER_TEXT } from "@/lib/compliance/disclaimers";

export function appendCsvDisclaimer(csvContent: string) {
  const trimmedContent = csvContent.endsWith("\n") ? csvContent : `${csvContent}\n`;
  return `${trimmedContent}\n"Disclaimer","${EXPORT_REPORT_DISCLAIMER_TEXT.replaceAll('"', '""')}"\n`;
}

export function reportDisclaimerFooter() {
  return EXPORT_REPORT_DISCLAIMER_TEXT;
}
