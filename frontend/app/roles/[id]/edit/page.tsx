"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import RoleForm from "../../components/RoleForm";

import "../../roles.css";

type Permission = {
  id: number;
  name: string;
};

type Role = {
  id: number;
  name: string;
  active: boolean;
  isAdmin: boolean;
  groupId: number | null;
  reportsToRoleId: number | null;
  permissions?: {
    permission: Permission;
  }[];
};

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();

  const roleId = params.id;

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    loadRole();
  }, [router, roleId]);

  async function loadRole() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/roles/${roleId}`);

      setRole(response.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        router.replace("/login");
        return;
      }

      if (err?.response?.status === 403) {
        router.replace("/dashboard");
        return;
      }

      if (err?.response?.status === 404) {
        setError("Role not found.");
        return;
      }

      setError(
        err?.response?.data?.message ||
          "Unable to load role.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess(message: string) {
    sessionStorage.setItem(
      "rolesSuccessMessage",
      message,
    );

    router.push("/roles");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="company-page-loading">
          <div className="company-loading-spinner" />
          <span>Loading role...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!role) {
    return (
      <DashboardLayout>
        <div className="company-role-edit-page">
          <div className="company-page-header">
            <div>
              <div className="company-page-eyebrow">
                ACCESS MANAGEMENT
              </div>

              <h1>Role not found</h1>

              <p>
                The requested role could not be
                found or is no longer available.
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

          {error && (
            <div className="company-users-error">
              {error}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="company-role-edit-page">
        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              ACCESS MANAGEMENT
            </div>

            <h1>Edit {role.name}</h1>

            <p>
              Update this role&apos;s settings,
              reporting relationship, status, and
              permissions.
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

        {error && (
          <div className="company-users-error">
            {error}
          </div>
        )}

        <div className="company-role-edit-panel">
          <div className="company-role-edit-header">
            <div>
              <div className="company-panel-eyebrow">
                ROLE CONFIGURATION
              </div>

              <h2>Role details</h2>

              <p>
                Configure the role, reporting
                structure, and permissions.
              </p>
            </div>

            <div className="company-role-edit-badge">
              {role.isAdmin
                ? "Administrator"
                : role.active
                  ? "Active role"
                  : "Inactive role"}
            </div>
          </div>

          <div className="company-role-edit-body">
            <RoleForm
              mode="edit"
              role={role}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}