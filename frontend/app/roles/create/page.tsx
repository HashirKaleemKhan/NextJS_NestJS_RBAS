"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import RoleForm from "../components/RoleForm";

import "../roles.css";

export default function CreateRolePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const user: any = getUser();

    const permissions: string[] =
      user?.permissions || [];

    const isAdmin =
      user?.isAdmin === true;

    if (
      !isAdmin &&
      !permissions.includes("roles.manage")
    ) {
      router.replace("/dashboard");
    }
  }, [router]);

  function handleSuccess(message: string) {
    sessionStorage.setItem(
      "rolesSuccessMessage",
      message,
    );

    router.push("/roles");
  }

  return (
    <DashboardLayout>
      <div className="company-role-edit-page">
        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              ACCESS MANAGEMENT
            </div>

            <h1>Create role</h1>

            <p>
              Create a new role and configure its
              reporting relationship, status, and
              access permissions.
            </p>
          </div>

          <div className="company-page-actions">
            <button
              type="button"
              className="company-secondary-button"
              onClick={() => router.push("/roles")}
            >
              ← Back to roles
            </button>
          </div>
        </div>

        <div className="company-role-edit-panel">
          <div className="company-role-edit-header">
            <div>
              <div className="company-panel-eyebrow">
                ROLE CONFIGURATION
              </div>

              <h2>Role details</h2>

              <p>
                Configure the role, reporting
                structure, status, and permissions.
              </p>
            </div>

            <div className="company-role-edit-badge">
              New role
            </div>
          </div>

          <div className="company-role-edit-body">
            <RoleForm
              mode="create"
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}