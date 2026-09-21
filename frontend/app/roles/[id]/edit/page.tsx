"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

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

type RoleQueryData = {
  role: Role;
};

type RoleQueryVariables = {
  id: number;
};

const ROLE_QUERY = gql`
  query Role($id: Int!) {
    role(id: $id) {
      id
      name
      active
      isAdmin
      groupId
      reportsToRoleId
      permissions {
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

  const roleId = Number(params.id);

  const {
    data,
    loading,
    error: queryError,
  } = useQuery<
    RoleQueryData,
    RoleQueryVariables
  >(ROLE_QUERY, {
    variables: {
      id: roleId,
    },
    skip: !Number.isInteger(roleId),
    fetchPolicy: "network-only",
  });

  const role = data?.role ?? null;

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!queryError) {
      return;
    }

    const message =
      queryError.message || "";

    if (
      message.toLowerCase().includes(
        "unauthorized",
      ) ||
      message.toLowerCase().includes(
        "unauthenticated",
      )
    ) {
      router.replace("/login");
      return;
    }

    if (
      message.toLowerCase().includes(
        "forbidden",
      ) ||
      message.toLowerCase().includes(
        "not allowed",
      )
    ) {
      router.replace("/dashboard");
    }
  }, [queryError, router]);

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
                onClick={() =>
                  router.push("/roles")
                }
              >
                ← Back to roles
              </button>
            </div>
          </div>

          {queryError && (
            <div className="company-users-error">
              {queryError.message ||
                "Unable to load role."}
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
              onClick={() =>
                router.push("/roles")
              }
            >
              ← Back to roles
            </button>
          </div>
        </div>

        {queryError && (
          <div className="company-users-error">
            {queryError.message}
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