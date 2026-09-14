"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type Permission = {
  id: number;
  name: string;
};

type RolePermission = {
  permission: Permission;
};

type RoleUser = {
  id: number;
  name?: string;
  email?: string;
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
  users?: RoleUser[];
  permissions?: RolePermission[];
};

export default function ViewRolePage() {
  const params = useParams();
  const router = useRouter();

  const roleId = Number(params.id);

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadRole() {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get<Role>(`/roles/${roleId}`);

        setRole(response.data);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          router.replace("/login");
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

    if (Number.isFinite(roleId)) {
      loadRole();
    } else {
      setLoading(false);
      setError("Invalid role.");
    }
  }, [roleId, router]);

  const groupedPermissions = useMemo(() => {
    if (!role?.permissions) {
      return {};
    }

    return role.permissions.reduce(
      (
        groups: Record<string, Permission[]>,
        item,
      ) => {
        const permission = item.permission;

        const resource =
          permission.name.includes(".")
            ? permission.name.split(".")[0]
            : "Other";

        if (!groups[resource]) {
          groups[resource] = [];
        }

        groups[resource].push(permission);

        return groups;
      },
      {},
    );
  }, [role]);

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
        <div className="company-role-view-page">
          <div className="company-page-header">
            <div>
              <div className="company-page-eyebrow">
                ACCESS MANAGEMENT
              </div>

              <h1>Role not found</h1>

              <p>
                The requested role could not be found.
              </p>
            </div>

            <div className="company-page-actions">
              <button
                type="button"
                className="company-secondary-button"
                onClick={() => router.push("/roles")}
              >
                ← Back to Roles
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

  const permissionCount =
    role.permissions?.length || 0;

  const userCount =
    role.users?.length || 0;

  return (
    <DashboardLayout>
      <div className="company-role-view-page">
        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              ACCESS MANAGEMENT
            </div>

            <h1>{role.name}</h1>

            <p>
              View role information, reporting
              relationships, assigned users, and
              permissions.
            </p>
          </div>

          <div className="company-page-actions">
            <button
              type="button"
              className="company-secondary-button"
              onClick={() => router.push("/roles")}
            >
              ← Back to Roles
            </button>

            <button
              type="button"
              className="company-primary-button"
              onClick={() =>
                router.push(
                  `/roles/${role.id}/edit`,
                )
              }
            >
              ✎ Edit Role
            </button>
          </div>
        </div>

        <div className="company-role-view-grid">
          <section className="company-role-view-panel">
            <div className="company-role-view-panel-header">
              <div>
                <div className="company-panel-eyebrow">
                  ROLE DETAILS
                </div>

                <h2>Role Information</h2>

                <p>
                  Basic configuration and hierarchy
                  information for this role.
                </p>
              </div>

              <span
                className={`company-status-badge ${
                  role.active
                    ? "company-status-active"
                    : "company-status-inactive"
                }`}
              >
                <span className="company-status-dot" />

                {role.active
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

            <div className="company-role-view-details">
              <div className="company-role-view-detail">
                <span>Role Name</span>

                <strong>{role.name}</strong>
              </div>

              {/* <div className="company-role-view-detail">
                <span>Role Level</span>

                <strong>
                  {role.isAdmin
                    ? "Administrator"
                    : `Level ${role.level}`}
                </strong>
              </div> */}

              <div className="company-role-view-detail">
                <span>Group</span>

                {role.isAdmin ? (
                  <span className="company-admin-group-badge">
                    System Admin
                  </span>
                ) : (
                  <strong>
                    {role.group?.name ||
                      "Unassigned"}
                  </strong>
                )}
              </div>

              <div className="company-role-view-detail">
                <span>Reports To</span>

                <strong
                  className={
                    role.reportsToRole
                      ? ""
                      : "company-role-view-muted"
                  }
                >
                  {role.isAdmin
                    ? "Unassigned"
                    : role.reportsToRole
                      ? role.reportsToRole.name
                      : "Unassigned"}
                </strong>
              </div>

              <div className="company-role-view-detail">
                <span>Assigned Users</span>

                <span className="company-role-user-count">
                  {userCount}
                </span>
              </div>

              <div className="company-role-view-detail">
                <span>Total Permissions</span>

                <span className="company-role-badge company-role-badge-blue">
                  {role.isAdmin
                    ? "All access"
                    : `${permissionCount} ${
                        permissionCount === 1
                          ? "permission"
                          : "permissions"
                      }`}
                </span>
              </div>
            </div>
          </section>

          <section className="company-role-view-panel">
            <div className="company-role-view-panel-header">
              <div>
                <div className="company-panel-eyebrow">
                  ASSIGNED USERS
                </div>

                <h2>Users</h2>

                <p>
                  Users currently assigned to this
                  role.
                </p>
              </div>

              <span className="company-role-user-count">
                {userCount}
              </span>
            </div>

            {userCount === 0 ? (
              <div className="company-role-view-empty-small">
                <div className="company-role-view-empty-icon">
                  ◉
                </div>

                <h3>No users assigned</h3>

                <p>
                  There are currently no users with
                  this role.
                </p>
              </div>
            ) : (
              <div className="company-role-users-list">
                {role.users?.map((user) => (
                  <div
                    key={user.id}
                    className="company-role-user-row"
                  >
                    <div className="company-user-avatar">
                      {user.name
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>

                    <div className="company-role-user-info">
                      <strong>
                        {user.name ||
                          "Unnamed User"}
                      </strong>

                      {user.email && (
                        <span>{user.email}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="company-role-view-panel company-role-permissions-panel">
          <div className="company-role-view-panel-header">
            <div>
              <div className="company-panel-eyebrow">
                ACCESS CONTROL
              </div>

              <h2>Permissions</h2>

              <p>
                Permissions currently assigned to
                this role.
              </p>
            </div>

            <span className="company-role-badge company-role-badge-green">
              {role.isAdmin
                ? "Full system access"
                : `${permissionCount} ${
                    permissionCount === 1
                      ? "permission"
                      : "permissions"
                  }`}
            </span>
          </div>

          {role.isAdmin ? (
            <div className="company-role-admin-access">
              <div className="company-role-admin-access-icon">
                ✓
              </div>

              <div>
                <h3>Administrator Access</h3>

                <p>
                  This role has full system access.
                  Individual permissions are not
                  required.
                </p>
              </div>
            </div>
          ) : permissionCount === 0 ? (
            <div className="company-role-view-empty">
              <div className="company-role-view-empty-icon">
                ◆
              </div>

              <h3>No permissions assigned</h3>

              <p>
                This role currently has no
                permissions.
              </p>
            </div>
          ) : (
            <div className="company-role-permission-groups">
              {Object.entries(
                groupedPermissions,
              ).map(
                ([resource, permissions]) => (
                  <div
                    key={resource}
                    className="company-role-permission-group"
                  >
                    <div className="company-role-permission-group-header">
                      <h3>
                        {resource
                          .replace(
                            /[-_]/g,
                            " ",
                          )
                          .replace(
                            /\b\w/g,
                            (letter) =>
                              letter.toUpperCase(),
                          )}
                      </h3>

                      <span>
                        {permissions.length}
                      </span>
                    </div>

                    <div className="company-role-permission-list">
                      {permissions.map(
                        (permission) => (
                          <div
                            key={
                              permission.id
                            }
                            className="company-role-permission"
                          >
                            <span className="company-role-permission-check">
                              ✓
                            </span>

                            <span>
                              {
                                permission.name
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}