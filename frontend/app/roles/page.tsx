"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type RolePermission = {
  permission: {
    id: number;
    name: string;
  };
};

type Role = {
  id: number;
  name: string;
  users?: {
    id: number;
  }[];
  permissions?: RolePermission[];
};

type Permission = {
  id: number;
  name: string;
};

export default function RolesPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<
    Permission[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [editingRole, setEditingRole] =
    useState<Role | null>(null);

  const [selectedPermissions, setSelectedPermissions] =
    useState<number[]>([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const user: any = getUser();

    const permissions: string[] =
      user?.permissions || [];

    if (!permissions.includes("roles.manage")) {
      router.replace("/dashboard");
      return;
    }

    async function loadData() {
      try {
        const [rolesResponse, permissionsResponse] =
          await Promise.all([
            api.get("/roles"),
            api.get("/roles/permissions"),
          ]);

        setRoles(rolesResponse.data);
        setAllPermissions(
          permissionsResponse.data,
        );
      } catch (error: any) {
        if (error?.response?.status === 401) {
          router.replace("/login");
          return;
        }

        if (error?.response?.status === 403) {
          router.replace("/dashboard");
          return;
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  function openEditPermissions(role: Role) {
    const assignedPermissionIds =
      role.permissions?.map(
        (rolePermission) =>
          rolePermission.permission.id,
      ) || [];

    setEditingRole(role);
    setSelectedPermissions(
      assignedPermissionIds,
    );
  }

  function togglePermission(permissionId: number) {
    setSelectedPermissions((current) => {
      if (current.includes(permissionId)) {
        return current.filter(
          (id) => id !== permissionId,
        );
      }

      return [...current, permissionId];
    });
  }

  async function savePermissions() {
    if (!editingRole) {
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch(
        `/roles/${editingRole.id}/permissions`,
        {
          permissionIds: selectedPermissions,
        },
      );

      setRoles((currentRoles) =>
        currentRoles.map((role) =>
          role.id === editingRole.id
            ? response.data
            : role,
        ),
      );

      setEditingRole(null);
    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
          "Unable to update permissions.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Loading roles...
        </div>
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

          <h1>Roles</h1>

          <p>
            View roles, assigned permissions, and
            users.
          </p>
        </div>

        <button
          className="button button-secondary"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      <div className="roles-grid">
        {roles.map((role) => (
          <div
            className="role-card"
            key={role.id}
          >
            <div className="role-card-top">
              <div className="role-large-icon">
                {role.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h2>{role.name}</h2>

                <p>
                  Role ID #{role.id}
                </p>
              </div>
            </div>

            <div className="role-stats">
              <div>
                <span className="role-stat-number">
                  {role.users?.length || 0}
                </span>

                <span className="role-stat-label">
                  Users
                </span>
              </div>

              <div>
                <span className="role-stat-number">
                  {role.permissions?.length ||
                    0}
                </span>

                <span className="role-stat-label">
                  Permissions
                </span>
              </div>
            </div>

            <div className="role-permissions">
              <div className="role-section-label">
                ASSIGNED PERMISSIONS
              </div>

              {role.permissions &&
              role.permissions.length > 0 ? (
                <div className="permission-badges">
                  {role.permissions.map(
                    (rolePermission) => (
                      <span
                        className="permission-badge"
                        key={
                          rolePermission
                            .permission.id
                        }
                      >
                        {
                          rolePermission
                            .permission.name
                        }
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <p className="role-no-permissions">
                  No permissions assigned.
                </p>
              )}
            </div>

            <button
              className="button button-primary role-edit-button"
              onClick={() =>
                openEditPermissions(role)
              }
            >
              Edit permissions
            </button>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="roles-empty">
            <div className="empty-icon">
              ◆
            </div>

            <h3>No roles found</h3>

            <p>
              There are currently no roles in
              the system.
            </p>
          </div>
        )}
      </div>

      {editingRole && (
        <div className="modal-overlay">
          <div className="edit-modal role-permission-modal">
            <div className="modal-header">
              <div>
                <h2>
                  Edit {editingRole.name}
                  permissions
                </h2>

                <p>
                  Choose which permissions this
                  role should have.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setEditingRole(null)
                }
              >
                ×
              </button>
            </div>

            <div className="permissions-editor">
              {allPermissions.map(
                (permission) => (
                  <label
                    className="permission-option"
                    key={permission.id}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(
                        permission.id,
                      )}
                      onChange={() =>
                        togglePermission(
                          permission.id,
                        )
                      }
                    />

                    <span>
                      {permission.name}
                    </span>
                  </label>
                ),
              )}
            </div>

            {allPermissions.length === 0 && (
              <p className="role-no-permissions">
                No permissions exist in the
                system.
              </p>
            )}

            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={() =>
                  setEditingRole(null)
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="button button-primary"
                onClick={savePermissions}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}