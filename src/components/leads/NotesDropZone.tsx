"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NoteAnalysis } from "@/types";

interface RedirectData {
  clientId: string;
  clientName: string;
  score: number;
}

interface BankResult {
  transactionsAdded: number;
  newScore: number;
  keyObservations: string;
}

interface Props {
  clientId: string;
  clientName: string;
  existingAnalyses: NoteAnalysis[];
}

type Status = "idle" | "dragging" | "reading" | "analyzing" | "success" | "error";

const VALID_EXTENSIONS = [".txt", ".docx", ".doc", ".xlsx", ".xls", ".pdf"];
const BINARY_EXTENSIONS = [".xlsx", ".xls", ".pdf"];

export default function NotesDropZone({ clientId, clientName, existingAnalyses }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [analyses, setAnalyses] = useState<NoteAnalysis[]>(existingAnalyses);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [redirectData, setRedirectData] = useState<RedirectData | null>(null);
  const [bankResult, setBankResult] = useState<BankResult | null>(null);
  const [fileProgress, setFileProgress] = useState({ current: 0, total: 0 });
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Upload & analyze a single file, returning true on success */
  const processOneFile = useCallback(async (file: File): Promise<boolean> => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!VALID_EXTENSIONS.includes(ext)) return false;

    const isBinary = BINARY_EXTENSIONS.includes(ext);

    if (!isBinary) {
      try {
        const text = await file.text();
        if (!text.trim()) return false;
      } catch {
        return false;
      }
    }

    let res: Response;
    if (isBinary) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", clientId);
      res = await fetch("/api/analyze-notes", { method: "POST", body: formData });
    } else {
      const text = await file.text();
      res = await fetch("/api/analyze-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, notesText: text }),
      });
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Analysis failed");
    }

    const data = await res.json();

    if (data.redirect) {
      setRedirectData({ clientId: data.clientId, clientName: data.clientName, score: data.score });
      return true;
    }

    if (data.bankStatementProcessed) {
      setBankResult({
        transactionsAdded: data.transactionsAdded,
        newScore: data.newScore,
        keyObservations: data.keyObservations,
      });
      return true;
    }

    if (data.noteAnalysis) {
      setAnalyses(prev => [data.noteAnalysis, ...prev]);
    }
    return true;
  }, [clientId]);

  /** Process multiple files sequentially */
  const processFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      return VALID_EXTENSIONS.includes(ext);
    });

    if (valid.length === 0) {
      setStatus("error");
      setErrorMessage("No supported files found. Please upload .txt, .docx, .xlsx, or .pdf files");
      return;
    }

    setRedirectData(null);
    setBankResult(null);
    setFileProgress({ current: 0, total: valid.length });
    let lastRedirect: RedirectData | null = null;

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      setFileName(file.name);
      setFileProgress({ current: i + 1, total: valid.length });
      setStatus(i === 0 ? "reading" : "analyzing");

      // Brief pause to show file name before analyzing
      setStatus("analyzing");

      try {
        await processOneFile(file);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          `${file.name}: ${err instanceof Error ? err.message : "Analysis failed"}`
        );
        return;
      }
    }

    setStatus("success");

    // Refresh SSR sections (transactions table, AI analysis, signals, score)
    router.refresh();

    if (redirectData || lastRedirect) {
      const rd = redirectData ?? lastRedirect;
      if (rd) setTimeout(() => router.push(`/leads/${rd.clientId}`), 2500);
    } else {
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [processOneFile, router, redirectData]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setStatus("dragging");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setStatus("idle");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) processFiles(files);
    e.target.value = "";
  };

  const progressLabel = fileProgress.total > 1
    ? ` (${fileProgress.current} of ${fileProgress.total})`
    : "";

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => status === "idle" && fileInputRef.current?.click()}
        className={`relative rounded-[8px] border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
          status === "dragging"
            ? "border-ws-orange bg-ws-orange-light/50 scale-[1.02]"
            : status === "analyzing" || status === "reading"
            ? "border-gray-30 bg-gray-05 cursor-wait"
            : status === "success"
            ? "border-ws-green bg-ws-green-light"
            : status === "error"
            ? "border-ws-red bg-ws-red-light"
            : "border-gray-30 bg-cream hover:border-ws-orange hover:bg-ws-orange-light/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx,.doc,.xlsx,.xls,.pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {status === "idle" && (
          <>
            <UploadIcon />
            <p className="text-sm font-medium text-dune mt-2">Drop notes or statements here</p>
            <p className="text-xs text-gray-50 mt-1">or click to browse &middot; .txt, .docx, .xlsx, .pdf &middot; multiple files OK</p>
          </>
        )}

        {status === "dragging" && (
          <>
            <UploadIcon active />
            <p className="text-sm font-semibold text-ws-orange mt-2">Release to upload</p>
          </>
        )}

        {(status === "reading" || status === "analyzing") && (
          <>
            <div className="inline-block w-6 h-6 border-2 border-ws-orange border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-dune mt-2">
              Analyzing {fileName}...{progressLabel}
            </p>
            <p className="text-xs text-gray-50 mt-1">Claude is reviewing the document</p>
          </>
        )}

        {status === "success" && !redirectData && !bankResult && (
          <>
            <CheckIcon />
            <p className="text-sm font-semibold text-ws-green-dark mt-2">
              {fileProgress.total > 1
                ? `${fileProgress.total} documents analyzed`
                : "Analysis complete"}
            </p>
          </>
        )}

        {status === "success" && bankResult && (
          <>
            <CheckIcon />
            <p className="text-sm font-semibold text-ws-green-dark mt-2">
              Bank statement processed &mdash; {bankResult.transactionsAdded} transactions added
            </p>
            <p className="text-xs text-gray-50 mt-1">
              Updated score: {bankResult.newScore}/100
            </p>
          </>
        )}

        {status === "success" && redirectData && (
          <>
            <CheckIcon />
            <p className="text-sm font-semibold text-ws-green-dark mt-2">
              New lead created: {redirectData.clientName}
            </p>
            <p className="text-xs text-gray-50 mt-1">
              Score: {redirectData.score}/100 &middot; Redirecting...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-sm font-semibold text-ws-red mt-2">{errorMessage}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}
              className="text-xs text-gray-50 underline mt-1"
            >
              Try again
            </button>
          </>
        )}
      </div>

      {/* Rendered Note Analyses */}
      {analyses.map(na => (
        <div key={na.id} className="bg-ws-white rounded-[8px] shadow-[var(--shadow-ws)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-ws-orange" />
              <h3 className="text-sm font-semibold text-gray-50 uppercase tracking-wider">
                Notes Insight
              </h3>
            </div>
            {na.scoreAdjustment !== 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                na.scoreAdjustment > 0
                  ? "bg-ws-green-light text-ws-green-dark"
                  : "bg-ws-red-light text-ws-red"
              }`}>
                {na.scoreAdjustment > 0 ? "+" : ""}{na.scoreAdjustment} score
              </span>
            )}
          </div>

          <p className="text-sm text-dune leading-relaxed">{na.summaryAddendum}</p>

          {na.insights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-1">Key Insights</p>
              <ul className="space-y-1">
                {na.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-gray-70 flex items-start gap-2">
                    <span className="text-ws-green mt-0.5 flex-shrink-0">&bull;</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {na.newSignals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-1">New Signals</p>
              <div className="space-y-1.5">
                {na.newSignals.map((sig, i) => (
                  <div key={i} className={`text-sm px-3 py-1.5 rounded-[4px] border-l-3 ${
                    sig.severity === "high"
                      ? "border-l-ws-green bg-ws-green-light/50"
                      : sig.severity === "medium"
                      ? "border-l-ws-orange bg-ws-orange-light/50"
                      : "border-l-gray-30 bg-gray-05"
                  }`}>
                    <span className="font-medium text-dune">{sig.type}</span>
                    <span className="text-gray-50"> &mdash; {sig.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {na.updatedRecommendations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-1">Updated Recommendations</p>
              <ul className="space-y-1">
                {na.updatedRecommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-gray-70 flex items-start gap-2">
                    <span className="text-ws-orange mt-0.5 flex-shrink-0">{i + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UploadIcon({ active = false }: { active?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mx-auto" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 18V6" stroke={active ? "#E8661A" : "#807E7C"} strokeWidth="2" strokeLinecap="round" />
      <path d="M9 11L14 6L19 11" stroke={active ? "#E8661A" : "#807E7C"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18V22C4 23.1046 4.89543 24 6 24H22C23.1046 24 24 23.1046 24 22V18" stroke={active ? "#E8661A" : "#807E7C"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mx-auto" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="10" stroke="#007A56" strokeWidth="2" />
      <path d="M9 14L12.5 17.5L19 11" stroke="#007A56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
