"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "dragging" | "reading" | "analyzing" | "success" | "error";

interface SuccessData {
  clientId: string;
  clientName: string;
  score: number;
}

export default function NewLeadDropZone() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const processFile = useCallback(async (file: File) => {
    const validTypes = [".txt", ".docx", ".doc"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validTypes.includes(ext)) {
      setStatus("error");
      setErrorMessage("Please upload a .txt or .docx file");
      return;
    }

    setFileName(file.name);
    setStatus("reading");

    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus("error");
      setErrorMessage("Failed to read file");
      return;
    }

    if (!text.trim()) {
      setStatus("error");
      setErrorMessage("File appears to be empty");
      return;
    }

    setStatus("analyzing");

    try {
      const res = await fetch("/api/create-lead-from-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notesText: text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lead creation failed");
      }

      const data: SuccessData = await res.json();
      setSuccessData(data);
      setStatus("success");

      // Redirect to the new lead after a brief delay
      setTimeout(() => {
        router.push(`/leads/${data.clientId}`);
      }, 2000);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Lead creation failed");
    }
  }, [router]);

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
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  return (
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
        accept=".txt,.docx,.doc"
        onChange={handleFileSelect}
        className="hidden"
      />

      {status === "idle" && (
        <>
          <UploadIcon />
          <p className="text-lg font-semibold text-dune mt-4">
            Drop your meeting notes here
          </p>
          <p className="text-sm text-gray-50 mt-2 max-w-md mx-auto">
            Upload notes from a sales call or client meeting. The AI will extract
            client information, identify opportunities, and create a scored lead.
          </p>
          <p className="text-xs text-gray-30 mt-3">
            or click to browse &middot; .txt, .docx
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
            {status === "reading" ? "Reading file..." : `Analyzing ${fileName}...`}
          </p>
          <p className="text-sm text-gray-50 mt-2">
            Claude is extracting client info and scoring the lead
          </p>
        </>
      )}

      {status === "success" && successData && (
        <>
          <CheckIcon />
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

      {status === "error" && (
        <>
          <p className="text-lg font-semibold text-ws-red mt-2">{errorMessage}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}
            className="text-sm text-gray-50 underline mt-2"
          >
            Try again
          </button>
        </>
      )}
    </div>
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
