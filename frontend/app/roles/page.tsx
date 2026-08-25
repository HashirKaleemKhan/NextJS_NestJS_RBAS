"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import {logout } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type Permission = {
  id: number;
  name: string;
};

type RolePermission = {
  permission: Permission;
};

type Group = {
  id: number;
  name: string;
  active: boolean;
};

type Role = {
  id: number;
  name: string;
  level: number;
  isAdmin: boolean;
  active: boolean;

  groupId: number | null;
  group?: Group | null;

  reportsToRoleId: number | null;

  reportsToRole?: {
    id: number;
    name: string;
  } | null;

  users?: {
    id: number;
    name?: string;
  }[];

  permissions?: RolePermission[];
};

export default function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -----------------------------------
  // SUCCESS MESSAGE
  // -----------------------------------

  const success = searchParams.get("success");

  // -----------------------------------
  // LOAD ROLES
  // -----------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }
    loadRoles();
  }, []);

  // -----------------------------------
  // HANDLE SUCCESS MESSAGE
  // -----------------------------------

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace("/roles");
    }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [success, router]);

  // -----------------------------------
  // LOAD ROLES
  // -----------------------------------

  async function loadRoles() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/roles");

      setRoles(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load roles.",
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------
  // DELETE ROLE
  // -----------------------------------

  async function deleteRole(role: Role) {
    const confirmed = window.confirm(
      `Delete "${role.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/roles/${role.id}`);

      await loadRoles();

      router.replace(
        "/roles?success=deleted",
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete role.",
      );
    }
  }

  // -----------------------------------
  // TOGGLE ROLE STATUS
  // -----------------------------------

  async function toggleRole(role: Role) {
    try {
      setError("");

      await api.patch(
        `/roles/${role.id}/status`,
      );

      await loadRoles();

      router.replace(
        `/roles?success=${
          role.active
            ? "deactivated"
            : "activated"
        }`,
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to update role status.",
      );
    }
  }

  // -----------------------------------
  // SUCCESS MESSAGE TEXT
  // -----------------------------------

  function getSuccessMessage() {
    switch (success) {
      case "created":
        return "Role created successfully.";

      case "updated":
        return "Role updated successfully.";

      case "deleted":
        return "Role deleted successfully.";

      case "activated":
        return "Role activated successfully.";

      case "deactivated":
        return "Role deactivated successfully.";

      default:
        return "";
    }
  }

  // -----------------------------------
  // COUNTS
  // -----------------------------------

  const totalRoles = roles.length;

  const activeRoles = roles.filter(
    (role) => role.active,
  ).length;

  const inactiveRoles = roles.filter(
    (role) => !role.active,
  ).length;

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Loading roles...
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <DashboardLayout>
      <div className="groups-page">

        {/* -------------------------------- */}
        {/* HEADER */}
        {/* -------------------------------- */}

        <div className="page-header">
          <div>
            <div className="page-eyebrow">
              ROLE MANAGEMENT
            </div>

            <h1>Roles</h1>

            <p>
              Manage application roles and
              their access levels.
            </p>
          </div>

          <div className="page-header-actions">
            <button
              className="button button-primary"
              onClick={() =>
                router.push(
                  "/roles/create",
                )
              }
            >
              + Create role
            </button>
            <button
            className="button button-secondary"
            onClick={logout}
          >
            Logout
          </button>
          </div>
        </div>

        {/* -------------------------------- */}
        {/* SUCCESS */}
        {/* -------------------------------- */}

        {success && getSuccessMessage() && (
          <div className="groups-alert groups-alert-success">
            ✓ {getSuccessMessage()}
          </div>
        )}

        {/* -------------------------------- */}
        {/* ERROR */}
        {/* -------------------------------- */}

        {error && (
          <div className="groups-alert groups-alert-error">
            {Array.isArray(error)
              ? error.join(", ")
              : error}
          </div>
        )}

        {/* -------------------------------- */}
        {/* ROLE STATS */}
        {/* -------------------------------- */}

        <div className="stats-grid">

          {/* TOTAL */}

          <div className="stat-card stat-card-total">
            <div className="stat-card-content">
              <span className="stat-card-label">
                Total
              </span>

              <strong className="stat-card-value">
                {totalRoles}
              </strong>

              <span className="stat-card-description">
                Total roles
              </span>
            </div>
          </div>

          {/* ACTIVE */}

          <div className="stat-card stat-card-active">
            <div className="stat-card-content">
              <span className="stat-card-label">
                Active
              </span>

              <strong className="stat-card-value">
                {activeRoles}
              </strong>

              <span className="stat-card-description">
                Available roles
              </span>
            </div>
          </div>

          {/* INACTIVE */}

          <div className="stat-card stat-card-inactive">
            <div className="stat-card-content">
              <span className="stat-card-label">
                Inactive
              </span>

              <strong className="stat-card-value">
                {inactiveRoles}
              </strong>

              <span className="stat-card-description">
                Disabled roles
              </span>
            </div>
          </div>

        </div>

        {/* -------------------------------- */}
        {/* EXISTING ROLES */}
        {/* -------------------------------- */}

        <div className="content-card">

          <div
            style={{
              padding: "20px 24px",
              borderBottom:
                "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="page-eyebrow">
              CONFIGURATION
            </div>

            <h2>
              Existing roles
            </h2>

            <p>
              Manage roles currently
              available in your organization.
            </p>
          </div>

          {/* -------------------------------- */}
          {/* EMPTY */}
          {/* -------------------------------- */}

          {roles.length === 0 ? (
            <div className="empty-state">

              <div className="empty-icon">
                ◉
              </div>

              <h3>
                No roles configured
              </h3>

              <p>
                Create your first role
                to get started.
              </p>

              <button
                className="button button-primary"
                onClick={() =>
                  router.push(
                    "/roles/create",
                  )
                }
              >
                Create role
              </button>

            </div>
          ) : (

            /* -------------------------------- */
            /* TABLE */
            /* -------------------------------- */

            <div className="table-wrapper">

              <table className="users-table">

                <thead>
                  <tr>

                    <th>
                      ROLE
                    </th>

                    <th>
                      GROUP
                    </th>

                    <th>
                      REPORTS TO
                    </th>

                    <th>
                      USERS
                    </th>

                    <th>
                      PERMISSIONS
                    </th>

                    <th>
                      STATUS
                    </th>

                    <th>
                      ACTIONS
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {roles.map(
                    (role) => (
                      <tr
                        key={role.id}
                      >

                        {/* ROLE */}

                        <td>
                          <div className="user-cell">

                            <div className="user-avatar">
                              {role.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>

                              <div className="user-name">
                                {role.name}
                              </div>

                              <div className="user-id">
                                ID #{role.id}
                              </div>

                            </div>

                          </div>
                        </td>

                        {/* GROUP */}

                        <td>

                          {role.isAdmin ? (
                            <span>
                              Administrator
                            </span>
                          ) : (
                            <span>
                              {role.group?.name ||
                                "No group"}
                            </span>
                          )}

                        </td>

                        {/* REPORTS TO */}

                        <td>

                          {role.isAdmin ? (
                            <span>
                              None
                            </span>
                          ) : (
                            <span>
                              {role.reportsToRole
                                ?.name ||
                                "Not configured"}
                            </span>
                          )}

                        </td>

                        {/* USERS */}

                        <td>

                          <span>
                            {role.users?.length ||
                              0}{" "}
                            {(role.users?.length ||
                              0) === 1
                              ? "user"
                              : "users"}
                          </span>

                        </td>

                        {/* PERMISSIONS */}

                        <td>

                          {role.isAdmin ? (
                            <span className="group-permission-chip">
                              Full access
                            </span>
                          ) : (
                            <div
                              style={{
                                display:
                                  "flex",
                                flexWrap:
                                  "wrap",
                                gap: "6px",
                              }}
                            >

                              {role.permissions &&
                              role.permissions.length >
                                0 ? (
                                role.permissions.map(
                                  ({
                                    permission,
                                  }) => (
                                    <span
                                      key={
                                        permission.id
                                      }
                                      className="group-permission-chip"
                                    >
                                      {permission.name
                                        .split(
                                          ".",
                                        )[0]
                                        .replace(
                                          /^./,
                                          (
                                            char,
                                          ) =>
                                            char.toUpperCase(),
                                        )}
                                    </span>
                                  ),
                                )
                              ) : (
                                <span>
                                  No permissions
                                </span>
                              )}

                            </div>
                          )}

                        </td>

                        {/* STATUS */}

                        <td>

                          <span
                            className={`group-status ${
                              role.active
                                ? "group-status-active"
                                : "group-status-inactive"
                            }`}
                          >

                            <span />

                            {role.active
                              ? "Active"
                              : "Inactive"}

                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div className="user-actions">

                            {/* EDIT */}

                            <button
                              className="edit-button"
                              onClick={() =>
                                router.push(
                                  `/roles/${role.id}/edit`,
                                )
                              }
                            >
                              Edit
                            </button>

                            {/* STATUS */}

                            {!role.isAdmin && (
                              <button
                                className="edit-button"
                                onClick={() =>
                                  toggleRole(
                                    role,
                                  )
                                }
                              >
                                {role.active
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            )}

                            {/* DELETE */}

                            {!role.isAdmin && (
                              <button
                                className="delete-button"
                                onClick={() =>
                                  deleteRole(
                                    role,
                                  )
                                }
                              >
                                Delete
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>
                    ),
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>
    </DashboardLayout>
  );
}