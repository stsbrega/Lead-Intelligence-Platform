"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

type LeadCreationStatus = "idle" | "reading" | "analyzing" | "success" | "error";

interface LeadCreationState {
  status: LeadCreationStatus;
  fileName: string;
  clientName: string;
  score: number;
  clientId: string;
  errorMessage: string;
}

interface LeadCreationContextValue {
  state: LeadCreationState;
  startReading: (fileName: string) => void;
  startAnalyzing: (fileName: string) => void;
  setSuccess: (clientId: string, clientName: string, score: number) => void;
  setError: (message: string) => void;
  reset: () => void;
}

const initialState: LeadCreationState = {
  status: "idle",
  fileName: "",
  clientName: "",
  score: 0,
  clientId: "",
  errorMessage: "",
};

const LeadCreationContext = createContext<LeadCreationContextValue | null>(null);

export function LeadCreationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LeadCreationState>(initialState);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const startReading = useCallback((fileName: string) => {
    clearTimer();
    setState({ ...initialState, status: "reading", fileName });
  }, [clearTimer]);

  const startAnalyzing = useCallback((fileName: string) => {
    clearTimer();
    setState(prev => ({ ...prev, status: "analyzing", fileName }));
  }, [clearTimer]);

  const setSuccess = useCallback((clientId: string, clientName: string, score: number) => {
    clearTimer();
    setState(prev => ({
      ...prev,
      status: "success",
      clientId,
      clientName,
      score,
    }));
    // Auto-dismiss after 5 seconds
    dismissTimer.current = setTimeout(() => {
      setState(initialState);
    }, 5000);
  }, [clearTimer]);

  const setError = useCallback((message: string) => {
    clearTimer();
    setState(prev => ({ ...prev, status: "error", errorMessage: message }));
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState(initialState);
  }, [clearTimer]);

  return (
    <LeadCreationContext.Provider value={{ state, startReading, startAnalyzing, setSuccess, setError, reset }}>
      {children}
    </LeadCreationContext.Provider>
  );
}

export function useLeadCreation(): LeadCreationContextValue {
  const ctx = useContext(LeadCreationContext);
  if (!ctx) {
    throw new Error("useLeadCreation must be used within a LeadCreationProvider");
  }
  return ctx;
}
