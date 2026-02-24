"use client";

import { LeadCreationProvider } from "@/context/LeadCreationContext";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LeadCreationProvider>
      {children}
    </LeadCreationProvider>
  );
}
