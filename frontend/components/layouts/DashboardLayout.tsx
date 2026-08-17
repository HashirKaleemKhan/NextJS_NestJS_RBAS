"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}