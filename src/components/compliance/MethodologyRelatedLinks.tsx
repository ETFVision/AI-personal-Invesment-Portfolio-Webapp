"use client";

import Link from "next/link";
import { useState } from "react";
import { DisclaimerModal } from "@/components/compliance/DisclaimerModal";

export function MethodologyRelatedLinks() {
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white/85 p-4 text-sm text-muted-foreground">
        <span className="font-medium text-slate-800">Related: </span>
        <Link href="/legal/disclosures" className="font-medium text-teal-800 underline-offset-4 hover:underline">
          Legal Disclosures
        </Link>
        <span className="px-2">|</span>
        <button
          type="button"
          onClick={() => setIsDisclaimerOpen(true)}
          className="font-medium text-teal-800 underline-offset-4 hover:underline"
        >
          Full Disclaimer
        </button>
      </div>
      <DisclaimerModal mode="readonly" open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen} />
    </>
  );
}
