"use client";

import Link from "next/link";
import { useLeadCreation } from "@/context/LeadCreationContext";

export default function GlobalProgressBar() {
  const { state, reset } = useLeadCreation();

  if (state.status === "idle") return null;

  const isProcessing = state.status === "reading" || state.status === "analyzing";

  return (
    <div
      className={`fixed top-0 left-60 right-0 z-50 transition-all duration-300 animate-slide-down ${
        isProcessing
          ? "bg-ws-orange"
          : state.status === "success"
          ? "bg-ws-green"
          : "bg-ws-red"
      }`}
    >
      <div className="flex items-center justify-between px-6 py-2.5 min-h-[40px]">
        {/* Content */}
        <div className="flex items-center gap-3 text-ws-white text-sm">
          {isProcessing && (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>
                {state.status === "reading"
                  ? `Reading ${state.fileName}...`
                  : `Analyzing ${state.fileName}... Claude is extracting client info`}
              </span>
            </>
          )}

          {state.status === "success" && (
            <>
              <CheckIcon />
              <span>
                Lead created: <strong>{state.clientName}</strong> &middot; Score {state.score}/100
              </span>
              <Link
                href={`/leads/${state.clientId}`}
                className="ml-2 underline font-semibold hover:opacity-80 transition-opacity"
              >
                View Lead &rarr;
              </Link>
            </>
          )}

          {state.status === "error" && (
            <>
              <ErrorIcon />
              <span>{state.errorMessage || "Lead creation failed"}</span>
            </>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={reset}
          className="text-ws-white/80 hover:text-ws-white transition-colors ml-4 p-1"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Indeterminate progress track for processing states */}
      {isProcessing && (
        <div className="h-[3px] w-full bg-white/20 overflow-hidden">
          <div className="h-full bg-white/60 animate-progress-indeterminate" />
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" />
      <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" />
      <path d="M8 4.5V8.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.75" fill="white" />
    </svg>
  );
}
