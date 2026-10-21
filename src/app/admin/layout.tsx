import React from "react";
import { RecruiterProvider } from "@/context/RecruiterContext";
import { AdminLayoutClient } from "./AdminLayoutClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecruiterProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </RecruiterProvider>
  );
}
