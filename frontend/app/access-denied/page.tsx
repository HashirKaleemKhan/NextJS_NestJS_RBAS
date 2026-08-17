"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="access-denied-page">
      <div className="access-denied-card">
        <div className="access-denied-icon">
          !
        </div>

        <h1>Access Denied</h1>

        <p>
          You don't have permission to access
          any area of this application.
        </p>

        <button
          className="button button-secondary"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}