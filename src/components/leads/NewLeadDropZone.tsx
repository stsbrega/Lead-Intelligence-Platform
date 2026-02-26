"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLeadCreation } from "@/context/LeadCreationContext";
import DuplicateCheckModal from "./DuplicateCheckModal";
import type { PendingLeadData } from "./DuplicateCheckModal";
import type { DuplicateCandidate } from "@/lib/data/duplicate-check";

type Status = "idle" | "dragging" | "reading" | "analyzing" | "success" | "error";

interface SuccessData {
  clientId: string;
  clientName: string;
  score: number;
}

const VALID_EXTENSIONS = [".txt", ".docx", ".doc", ".xlsx", ".xls", ".pdf"];
const BINARY_EXTENSIONS = [".xlsx", ".xls", ".pdf"];

export default function NewLeadDropZone() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [createdLeads, setCreatedLeads] = useState<SuccessData[]>([]);
  const [fileProgress, setFileProgress] = useState({ current: 0, total: 0 });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingLeadData, setPendingLeadData] = useState<PendingLeadData | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const leadCreation = useLeadCreation();

  /** Upload & create a lead from a single file */
  const processOneFile = useCallback(async (file: File): Promise<SuccessData> => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const isBinary = BINARY_EXTENSIONS.includes(ext);

    if (!isBinary) {
      const text = await file.text();
      if (!text.trim()) throw new Error("File appears to be empty");
    }

    let res: Response;
    if (isBinary) {
      const formData = new FormData();
      formData.append("file", file);
      res = await fetch("/api/create-lead-from-notes", { method: "POST", body: formData });
    } else {
      const text = await file.text();
      res = await fetch("/api/create-lead-from-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notesText: text }),
      });
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Lead creation failed");
    }

    const data = await res.json();

    if (data.requiresConfirmation) {
      setPendingLeadData(data.pendingLead);
      setDuplicateCandidates(data.duplicates || []);
      setShowDuplicateModal(true);
      setStatus("idle");
      leadCreation.reset();
      // Return a sentinel to signal the batch to stop processing
      throw new Error("__CONFIRMATION_NEEDED__");
    }

    return data;
  }, [leadCreation]);

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

    setCreatedLeads([]);
    setFileProgress({ current: 0, total: valid.length });

    const results: SuccessData[] = [];

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      setFileName(file.name);
      setFileProgress({ current: i + 1, total: valid.length });

      if (i === 0) {
        setStatus("reading");
        leadCreation.startReading(file.name);
      }

      setStatus("analyzing");
      leadCreation.startAnalyzing(file.name);

      try {
        const data = await processOneFile(file);
        results.push(data);
        setCreatedLeads([...results]);
      } catch (err) {
        // Confirmation needed — modal is already shown, stop batch
        if (err instanceof Error && err.message === "__CONFIRMATION_NEEDED__") return;
        setStatus("error");
        const msg = `${file.name}: ${err instanceof Error ? err.message : "Lead creation failed"}`;
        setErrorMessage(msg);
        leadCreation.setError(msg);
        return;
      }
    }

    const lastResult = results[results.length - 1];
    setSuccessData(lastResult);
    setStatus("success");
    leadCreation.setSuccess(lastResult.clientId, lastResult.clientName, lastResult.score);

    // Redirect to the last created lead after a brief delay
    setTimeout(() => {
      router.push(`/leads/${lastResult.clientId}`);
    }, valid.length > 1 ? 3000 : 2000);
  }, [router, leadCreation, processOneFile]);

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

  const handleConfirmCreate = useCallback(async () => {
    if (!pendingLeadData) return;
    const res = await fetch("/api/confirm-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_new",
        pendingLead: pendingLeadData,
        previousDuplicateIds: duplicateCandidates.map((d) => d.clientId),
      }),
    });
    const data = await res.json();

    if (data.requiresConfirmation) {
      setDuplicateCandidates(data.duplicates || []);
      return;
    }

    setShowDuplicateModal(false);
    setSuccessData({ clientId: data.clientId, clientName: data.clientName, score: data.score });
    setStatus("success");
    leadCreation.setSuccess(data.clientId, data.clientName, data.score);
    setTimeout(() => router.push(`/leads/${data.clientId}`), 2000);
  }, [pendingLeadData, duplicateCandidates, router, leadCreation]);

  const handleConfirmAttach = useCallback(async (existingClientId: string) => {
    if (!pendingLeadData) return;
    const res = await fetch("/api/confirm-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "attach_to_existing",
        pendingLead: pendingLeadData,
        existingClientId,
      }),
    });
    const data = await res.json();

    setShowDuplicateModal(false);
    setStatus("success");
    leadCreation.setSuccess(data.clientId, data.clientName, 0);
    setTimeout(() => router.push(`/leads/${existingClientId}`), 2000);
  }, [pendingLeadData, router, leadCreation]);

  const progressLabel = fileProgress.total > 1
    ? ` (${fileProgress.current} of ${fileProgress.total})`
    : "";

  return (
    <>
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => status === "idle" && fileInputRef.current?.click()}
      className={`relative rounded-[8px] border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
        status === "dragging"
          ? "border-ws-orange bg-ws-orange-light/50 scale-[1.01]"
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
          <p className="text-lg font-semibold text-dune mt-4">
            Drop your documents here
          </p>
          <p className="text-sm text-gray-50 mt-2 max-w-md mx-auto">
            Upload meeting notes, account statements, or other client documents.
            The AI will extract client information, identify opportunities, and create a scored lead.
          </p>
          <p className="text-xs text-gray-30 mt-3">
            or click to browse &middot; .txt, .docx, .xlsx, .pdf &middot; multiple files OK
          </p>
        </>
      )}

      {status === "dragging" && (
        <>
          <UploadIcon active />
          <p className="text-lg font-semibold text-ws-orange mt-4">
            Release to upload
          </p>
        </>
      )}

      {(status === "reading" || status === "analyzing") && (
        <>
          <div className="inline-block w-8 h-8 border-2 border-ws-orange border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-semibold text-dune mt-4">
            Analyzing {fileName}...{progressLabel}
          </p>
          <p className="text-sm text-gray-50 mt-2">
            Claude is extracting client info and scoring the lead
          </p>
          {/* Show already-created leads during batch processing */}
          {createdLeads.length > 0 && (
            <div className="mt-4 space-y-1">
              {createdLeads.map((lead, i) => (
                <p key={i} className="text-xs text-ws-green-dark">
                  ✓ {lead.clientName} — Score: {lead.score}/100
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {status === "success" && successData && (
        <>
          <CheckIcon />
          {createdLeads.length > 1 ? (
            <>
              <p className="text-lg font-semibold text-ws-green-dark mt-4">
                {createdLeads.length} leads created successfully
              </p>
              <div className="mt-3 space-y-1">
                {createdLeads.map((lead, i) => (
                  <p key={i} className="text-sm text-dune">
                    <span className="font-semibold">{lead.clientName}</span>
                    {" "}&middot; Score: <span className="font-semibold">{lead.score}</span>/100
                  </p>
                ))}
              </div>
              <p className="text-xs text-gray-50 mt-3">
                Redirecting to {successData.clientName}...
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-ws-green-dark mt-4">
                Lead created successfully
              </p>
              <p className="text-sm text-dune mt-2">
                <span className="font-semibold">{successData.clientName}</span>
                {" "}&middot; Score: <span className="font-semibold">{successData.score}</span>/100
              </p>
              <p className="text-xs text-gray-50 mt-2">
                Redirecting to lead details...
              </p>
            </>
          )}
        </>
      )}

      {status === "error" && (
        <>
          <p className="text-lg font-semibold text-ws-red mt-2">{errorMessage}</p>
          {createdLeads.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-50">Previously created:</p>
              {createdLeads.map((lead, i) => (
                <p key={i} className="text-xs text-ws-green-dark">
                  ✓ {lead.clientName} — Score: {lead.score}/100
                </p>
              ))}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setStatus("idle"); setCreatedLeads([]); }}
            className="text-sm text-gray-50 underline mt-2"
          >
            Try again
          </button>
        </>
      )}
    </div>

    {/* Duplicate Check Modal */}
    {pendingLeadData && (
      <DuplicateCheckModal
        open={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        pendingLead={pendingLeadData}
        duplicates={duplicateCandidates}
        onConfirmCreate={handleConfirmCreate}
        onConfirmAttach={handleConfirmAttach}
      />
    )}
    </>
  );
}

function UploadIcon({ active = false }: { active?: boolean }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 26V8" stroke={active ? "#E8661A" : "#807E7C"} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 15L20 8L27 15" stroke={active ? "#E8661A" : "#807E7C"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 26V32C6 33.6569 7.34315 35 9 35H31C32.6569 35 34 33.6569 34 32V26" stroke={active ? "#E8661A" : "#807E7C"} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="14" stroke="#007A56" strokeWidth="2.5" />
      <path d="M13 20L18 25L27 16" stroke="#007A56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
