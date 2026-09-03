"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { graphqlRequest } from "@/lib/graphql";
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
    roleId: number;
    permissionId: number;
    permission: Permission;
  }[];
};

type RoleQueryResponse = {
  role: Role;
};

const ROLE_QUERY = `
  query Role($id: Int!) {
    role(id: $id) {
      id
      name
      active
      isAdmin
      groupId
      reportsToRoleId
      permissions {
        roleId
        permissionId
        permission {
          id
          name
        }
      }
    }
  }
`;

export default function EditRolePage() {
  const router = useRouter();

  const params = useParams();

  const roleId = params.id;

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

      const data =
        await graphqlRequest<RoleQueryResponse>(
          ROLE_QUERY,
          {
            id: Number(roleId),
          },
        );

      setRole(data.role);
    } catch (err: any) {
      const message =
        err?.message ||
        "Unable to load role.";

      if (
        message
          .toLowerCase()
          .includes("not found")
      ) {
        setError(
          "Role not found.",
        );
        return;
      }

      setError(message);
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
