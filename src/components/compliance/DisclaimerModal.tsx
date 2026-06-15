"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DISCLAIMER_STORAGE_KEY, FULL_DISCLAIMER_TEXT } from "@/lib/compliance/disclaimers";
import { cn } from "@/lib/utils";

type DisclaimerModalProps = {
  mode?: "acknowledgement" | "readonly";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function DisclaimerModal({ mode = "acknowledgement", open, onOpenChange }: DisclaimerModalProps) {
  const isReadonly = mode === "readonly";
  const [internalOpen, setInternalOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isOpen = isReadonly ? Boolean(open) : internalOpen;

  const setModalOpen = useCallback((nextOpen: boolean) => {
    if (isReadonly) {
      onOpenChange?.(nextOpen);
      return;
    }
    setInternalOpen(nextOpen);
  }, [isReadonly, onOpenChange]);

  useEffect(() => {
    if (isReadonly) return;

    try {
      if (!window.localStorage.getItem(DISCLAIMER_STORAGE_KEY)) {
        setInternalOpen(true);
      }
    } catch {
      setInternalOpen(true);
    }
  }, [isReadonly]);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
    focusTarget?.focus();

    return () => {
      previousActiveElement?.focus();
    };
  }, [isOpen, isReadonly]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isReadonly) setModalOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isReadonly, setModalOpen]);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    const acknowledgedAt = new Date().toISOString();

    try {
      const response = await fetch("/api/user/disclaimer-acknowledged", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ acknowledged_at: acknowledgedAt })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to record acknowledgement.");
      }

      window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, acknowledgedAt);
      setInternalOpen(false);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Unable to record acknowledgement.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" aria-hidden={false}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="etfvision-disclaimer-title"
        aria-describedby="etfvision-disclaimer-body"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-2xl"
        tabIndex={-1}
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 id="etfvision-disclaimer-title" className="text-lg font-semibold text-slate-950">
            ETFVision Disclaimer
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isReadonly ? "Full compliance disclaimer." : "Please acknowledge this disclosure before continuing."}
          </p>
        </div>

        <div className="min-h-0 flex-1 px-5 py-4">
          <div
            id="etfvision-disclaimer-body"
            className="max-h-[44vh] overflow-y-auto rounded-md border border-slate-200 bg-muted/50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-line"
          >
            {FULL_DISCLAIMER_TEXT}
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 px-5 py-4">
          {!isReadonly ? (
            <div className="flex items-start gap-3">
              <input
                id="etfvision-disclaimer-checkbox"
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              />
              <Label htmlFor="etfvision-disclaimer-checkbox" className="text-sm font-medium leading-5 text-slate-800">
                I understand ETFVision provides analytics only and not investment advice
              </Label>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className={cn("flex items-center", isReadonly ? "justify-end" : "justify-between gap-4")}>
            {!isReadonly ? <p className="text-xs text-muted-foreground">Acknowledgement is required to use ETFVision.</p> : null}
            {isReadonly ? (
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            ) : (
              <Button type="button" disabled={!acknowledged || isSubmitting} onClick={handleConfirm}>
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
