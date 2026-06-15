"use client";

import { useState } from "react";
import { DisclaimerModal } from "@/components/compliance/DisclaimerModal";
import { FOOTER_DISCLAIMER_TEXT } from "@/lib/compliance/disclaimers";

export function DisclaimerFooter() {
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  return (
    <>
      <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-muted/80 px-4 py-2 text-xs text-muted-foreground shadow-[0_-4px_18px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-5">{FOOTER_DISCLAIMER_TEXT}</p>
          <button
            type="button"
            onClick={() => setIsDisclaimerOpen(true)}
            className="shrink-0 text-left font-medium text-teal-800 underline-offset-4 hover:underline sm:text-right"
          >
            Full disclaimer
          </button>
        </div>
      </footer>
      <DisclaimerModal mode="readonly" open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen} />
    </>
  );
}
