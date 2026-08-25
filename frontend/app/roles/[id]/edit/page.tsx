"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";

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
  ;

  const [role, setRole] =
    useState<Role | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("token");

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
      !permissions.includes(
        "roles.manage",
      )
    ) {
      router.replace("/dashboard");
      return;
    }

    loadRole();
  }, [router, roleId]);

  async function loadRole() {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          `/roles/${roleId}`,
        );

      setRole(response.data);
    } catch (err: any) {
      if (
        err?.response?.status === 404
      ) {
        setError(
          "Role not found.",
        );
        return;
      }

      if (
        err?.response?.status === 401
      ) {
        router.replace("/login");
        return;
      }

      if (
        err?.response?.status === 403
      ) {
        router.replace("/dashboard");
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

  function handleSuccess(
    message: string,
  ) {
    sessionStorage.setItem(
      "rolesSuccessMessage",
      message,
    );

    router.push("/roles");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Loading role...
        </div>
      </DashboardLayout>
    );
  }

  if (!role) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <div>
            <div className="page-eyebrow">
              ACCESS CONTROL
            </div>

            <h1>Role not found</h1>

            <p>{error}</p>
          </div>
        </div>

        <button
          className="button button-secondary"
          onClick={() =>
            router.push("/roles")
          }
        >
          Back to roles
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            ACCESS CONTROL
          </div>

          <h1>
            Edit {role.name}
          </h1>

          <p>
            Update this role's settings,
            reporting structure, and
            permissions.
          </p>
        </div>

        <button
          className="button button-secondary"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="content-card role-form-card">
        <div className="card-header">
          <div>
            <h2>Role details</h2>

            <p>
              Make changes to this role below.
            </p>
          </div>
        </div>

        <RoleForm
          mode="edit"
          role={role}
          onSuccess={handleSuccess}
        />
      </div>
    </DashboardLayout>
  );
}