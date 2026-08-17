"use client";

import { useEffect, useState } from "react";
import { getUser, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role?: string;
  permissions?: string[];
};

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const currentUser: any = getUser();

    const permissions: string[] =
      currentUser?.permissions || [];

    /*
     * User does not have dashboard.view.
     * Send them to the first section
     * they are actually allowed to access.
     */
    if (!permissions.includes("dashboard.view")) {
      if (permissions.includes("users.read")) {
        router.replace("/users");
        return;
      }

      if (permissions.includes("roles.manage")) {
        router.replace("/roles");
        return;
      }

      router.replace("/access-denied");
      return;
    }

    /*
     * User is allowed to see dashboard.
     * Put the user into React state so
     * the page can display their information.
     */
    setUser(currentUser);

    /*
     * IMPORTANT:
     * This was missing before.
     * Without it, the page stays on
     * "Loading..." forever.
     */
    setCheckingAuth(false);
  }, [router]);

  if (checkingAuth) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Loading...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            OVERVIEW
          </div>

          <h1>Dashboard</h1>

          <p>
            Welcome back,{" "}
            {user?.name || "User"}.
          </p>
        </div>

        <button
          className="button button-secondary"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            ACCOUNT
          </div>

          <div className="stat-value">
            {user?.name || "-"}
          </div>

          <div className="stat-description">
            Current user
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            EMAIL
          </div>

          <div className="stat-value stat-email">
            {user?.email || "-"}
          </div>

          <div className="stat-description">
            Account email
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            ROLE
          </div>

          <div className="stat-value">
            {user?.role || "-"}
          </div>

          <div className="stat-description">
            Access level
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            PERMISSIONS
          </div>

          <div className="stat-value">
            {user?.permissions?.length || 0}
          </div>

          <div className="stat-description">
            Assigned permissions
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <div>
            <h2>Your permissions</h2>

            <p>
              Permissions currently assigned to
              your account.
            </p>
          </div>
        </div>

        <div className="permission-list">
          {user?.permissions?.length ? (
            user.permissions.map(
              (permission: string) => (
                <span
                  className="permission-badge"
                  key={permission}
                >
                  {permission}
                </span>
              ),
            )
          ) : (
            <p className="empty-text">
              No permissions assigned.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

