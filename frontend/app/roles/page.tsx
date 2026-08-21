"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./roles.css";
import { api } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

import "./roles.css";

type Permission = {
  id: number;
  name: string;
};

type GroupPermission = {
  id: number;
  name: string;
  children: Permission[];
};

type Group = {
  id: number;
  name: string;
  active: boolean;
};

type RolePermission = {
  permission: Permission;
};

type Role = {
  id: number;
  name: string;
  level: number;
  isAdmin: boolean;
  active: boolean;
  groupId: number | null;
  group?: Group | null;

  users?: {
    id: number;
    name?: string;
  }[];

  permissions?: RolePermission[];
};

type RoleForm = {
  name: string;
  groupId: number | null;
  active: boolean;
  isAdmin: boolean;
};

export default function RolesPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [editingRole, setEditingRole] =
    useState<Role | null>(null);

  const [form, setForm] = useState<RoleForm>({
    name: "",
    groupId: null,
    active: true,
    isAdmin: false,
  });

  /*
   * When switching:
   *
   * normal role
   *      ↓
   * administrator
   *      ↓
   * normal role
   *
   * we remember the previous group so it can
   * be restored.
   */
  const [previousGroupId, setPreviousGroupId] =
    useState<number | null>(null);

  const [
    availablePermissions,
    setAvailablePermissions,
  ] = useState<GroupPermission[]>([]);

  const [
    selectedPermissions,
    setSelectedPermissions,
  ] = useState<number[]>([]);

  const [
    loadingPermissions,
    setLoadingPermissions,
  ] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // -----------------------------------
  // LOAD DATA
  // -----------------------------------

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
  return;
}

    loadData();
  }, [router]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        rolesResponse,
        groupsResponse,
      ] = await Promise.all([
        api.get("/roles"),
        api.get("/roles/groups"),
      ]);

      setRoles(rolesResponse.data);
      setGroups(groupsResponse.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        router.replace("/login");
        return;
      }

      if (err?.response?.status === 403) {
        router.replace("/dashboard");
        return;
      }

      setError(
        err?.response?.data?.message ||
          "Unable to load roles.",
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------
  // LOAD GROUP PERMISSIONS
  // -----------------------------------

  async function loadGroupPermissions(
    groupId: number,
    existingPermissionIds: number[] = [],
  ) {
    try {
      setLoadingPermissions(true);
      setError("");

      const response = await api.get(
        `/roles/groups/${groupId}/permissions`,
      );

      const groupPermissions: GroupPermission[] =
        response.data;

      setAvailablePermissions(
        groupPermissions,
      );

      const availableIds =
        groupPermissions.flatMap(
          (groupPermission) =>
            groupPermission.children.map(
              (permission) =>
                permission.id,
            ),
        );

      setSelectedPermissions(
        existingPermissionIds.filter((id) =>
          availableIds.includes(id),
        ),
      );
    } catch (err: any) {
      setAvailablePermissions([]);
      setSelectedPermissions([]);

      setError(
        err?.response?.data?.message ||
          "Unable to load group permissions.",
      );
    } finally {
      setLoadingPermissions(false);
    }
  }

  // -----------------------------------
  // OPEN CREATE
  // -----------------------------------

  function openCreate() {
    setEditingRole(null);

    setPreviousGroupId(null);

    setForm({
      name: "",
      groupId: null,
      active: true,
      isAdmin: false,
    });

    setAvailablePermissions([]);
    setSelectedPermissions([]);

    setError("");
    setSuccess("");

    setShowModal(true);
  }

  // -----------------------------------
  // OPEN EDIT
  // -----------------------------------

  function openEdit(role: Role) {
    const existingPermissionIds =
      role.permissions?.map(
        (rolePermission) =>
          rolePermission.permission.id,
      ) || [];

    setEditingRole(role);

    setPreviousGroupId(role.groupId);

    setForm({
      name: role.name,
      groupId: role.groupId,
      active: role.active,
      isAdmin: role.isAdmin,
    });

    setAvailablePermissions([]);
    setSelectedPermissions([]);

    setError("");
    setSuccess("");

    setShowModal(true);

    /*
     * Administrator roles don't have a group.
     *
     * Therefore there is nothing to load here
     * for an admin role.
     */
    if (!role.isAdmin && role.groupId) {
      loadGroupPermissions(
        role.groupId,
        existingPermissionIds,
      );
    }
  }

  // -----------------------------------
  // CLOSE MODAL
  // -----------------------------------

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingRole(null);

    setPreviousGroupId(null);

    setAvailablePermissions([]);
    setSelectedPermissions([]);

    setError("");
  }

  // -----------------------------------
  // CHANGE GROUP
  // -----------------------------------

  async function handleGroupChange(
    groupId: number | null,
  ) {
    setForm((current) => ({
      ...current,
      groupId,
    }));

    setSelectedPermissions([]);
    setAvailablePermissions([]);

    if (groupId === null) {
      return;
    }

    await loadGroupPermissions(groupId);
  }

  // -----------------------------------
  // TOGGLE ADMIN
  // -----------------------------------

  async function handleAdminChange(
    isAdmin: boolean,
  ) {
    if (isAdmin) {
      /*
       * Remember the current group before
       * converting the role into an administrator.
       */
      setPreviousGroupId(form.groupId);

      setForm((current) => ({
        ...current,
        isAdmin: true,
        groupId: null,
      }));

      setAvailablePermissions([]);
      setSelectedPermissions([]);

      return;
    }

    /*
     * Restore the group that existed before
     * administrator mode was enabled.
     */
    const restoredGroupId =
      previousGroupId;

    setForm((current) => ({
      ...current,
      isAdmin: false,
      groupId: restoredGroupId,
    }));

    if (restoredGroupId !== null) {
      const existingPermissionIds =
        editingRole?.permissions?.map(
          (rolePermission) =>
            rolePermission.permission.id,
        ) || [];

      await loadGroupPermissions(
        restoredGroupId,
        existingPermissionIds,
      );
    }
  }

  // -----------------------------------
  // TOGGLE PERMISSION
  // -----------------------------------

  function togglePermission(
    permissionId: number,
  ) {
    setSelectedPermissions((current) => {
      if (current.includes(permissionId)) {
        return current.filter(
          (id) => id !== permissionId,
        );
      }

      return [
        ...current,
        permissionId,
      ];
    });
  }

  // -----------------------------------
  // SAVE ROLE
  // -----------------------------------

  async function saveRole() {
    if (!form.name.trim()) {
      setError("Role name is required.");
      return;
    }

    if (!form.groupId && !form.isAdmin) {
      setError(
        "A group is required for non-administrator roles.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),

        /*
         * Administrator roles intentionally have
         * no group.
         */
        groupId: form.isAdmin
          ? null
          : form.groupId,

        active: form.active,

        isAdmin: form.isAdmin,

        permissionIds: form.isAdmin
          ? []
          : selectedPermissions,
      };

      let response: any;

      if (editingRole) {
        response = await api.patch(
          `/roles/${editingRole.id}`,
          payload,
        );

        setRoles((current) =>
          current.map((role) =>
            role.id === editingRole.id
              ? response.data
              : role,
          ),
        );

        setSuccess(
          "Role updated successfully.",
        );
      } else {
        response = await api.post(
          "/roles",
          payload,
        );

        setRoles((current) => [
          ...current,
          response.data,
        ]);

        setSuccess(
          "Role created successfully.",
        );
      }

      setShowModal(false);
      setEditingRole(null);
      setPreviousGroupId(null);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to save role.",
      );
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------
  // TOGGLE STATUS
  // -----------------------------------

  async function toggleRole(
    role: Role,
  ) {
    try {
      setError("");
      setSuccess("");

      const response = await api.patch(
        `/roles/${role.id}/status`,
      );

      setRoles((current) =>
        current.map((item) =>
          item.id === role.id
            ? response.data
            : item,
        ),
      );

      setSuccess(
        role.active
          ? "Role deactivated successfully."
          : "Role activated successfully.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to update role status.",
      );
    }
  }

  // -----------------------------------
  // DELETE ROLE
  // -----------------------------------

  async function deleteRole(
    role: Role,
  ) {
    if (
      !window.confirm(
        `Are you sure you want to delete "${role.name}"?`,
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/roles/${role.id}`,
      );

      setRoles((current) =>
        current.filter(
          (item) =>
            item.id !== role.id,
        ),
      );

      setSuccess(
        "Role deleted successfully.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete role.",
      );
    }
  }

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
  // RENDER
  // -----------------------------------

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            ACCESS CONTROL
          </div>

          <h1>Roles</h1>

          <p>
            Create and manage the roles available
            in your organization.
          </p>
        </div>

        <div className="roles-header-actions">
          <button
            className="button button-secondary"
            onClick={logout}
          >
            Logout
          </button>

          <button
            className="button button-primary"
            onClick={openCreate}
          >
            + Create role
          </button>
        </div>
      </div>

      {/* MESSAGES */}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {error && !showModal && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* ROLES */}

      <div className="roles-grid">
        {roles.map((role) => (
          <div
            className="role-card"
            key={role.id}
          >
            {/* CARD HEADER */}

            <div className="role-card-top">
              <div className="role-large-icon">
                {role.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="role-card-title">
                <h2>{role.name}</h2>

                <p>
                  Role ID #{role.id}
                </p>
              </div>

              <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {role.isAdmin && (
                    <span className="status-badge">
                      Administrator
                    </span>
                  )}

                  {role.active ? (
                    <span className="status-badge">
                      Active
                    </span>
                  ) : (
                    <span className="status-badge status-inactive">
                      Inactive
                    </span>
                  )}
                </div>
            </div>

            {/* ROLE INFO */}

            <div className="role-info-row">
              <div className="role-info-item">
                <span className="role-info-label">
                  GROUP
                </span>

                <strong>
                  {role.isAdmin
                    ? "Administrator"
                    : role.group?.name ||
                      "No group"}
                </strong>
              </div>

              <div className="role-info-item">
                <span className="role-info-label">
                  USERS
                </span>

                <strong>
                  {role.users?.length || 0}
                </strong>
              </div>

              <div className="role-info-item">
                <span className="role-info-label">
                  PERMISSIONS
                </span>

                <strong>
                  {role.permissions?.length ||
                    0}
                </strong>
              </div>
            </div>

            {/* PERMISSIONS */}

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
                  {role.isAdmin
                    ? "Administrator has full access."
                    : "No permissions assigned."}
                </p>
              )}
            </div>

            {/* ACTIONS */}

            <div className="role-actions">
              <button
                className="button button-primary"
                onClick={() =>
                  openEdit(role)
                }
              >
                Edit
              </button>

              {!role.isAdmin && (
                  <button
                    className="button button-secondary"
                    onClick={() =>
                      toggleRole(role)
                    }
                  >
                    {role.active
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                )}

              {!role.isAdmin && (
                <button
                  className="button button-danger"
                  onClick={() =>
                    deleteRole(role)
                  }
                >
                  Delete
                </button>
              )}
            </div>
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

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div className="modal-overlay">
          <div className="edit-modal role-permission-modal">
            {/* MODAL HEADER */}

            <div className="modal-header">
              <div>
                <h2>
                  {editingRole
                    ? `Edit ${editingRole.name}`
                    : "Create role"}
                </h2>

                <p>
                  Configure the role, group,
                  status, and permissions.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="role-modal-body">
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {/* ROLE NAME */}

              <div className="form-group">
                <label htmlFor="role-name">
                  Role name
                </label>

                <input
                  id="role-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name:
                        event.target.value,
                    }))
                  }
                  placeholder="e.g. HR Manager"
                  disabled={saving}
                />
              </div>

              {/* GROUP */}

              <div className="form-group">
                <label htmlFor="role-group">
                  Group
                </label>

                <select
                  id="role-group"
                  value={
                    form.groupId ?? ""
                  }
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    handleGroupChange(
                      value
                        ? Number(value)
                        : null,
                    );
                  }}
                  disabled={
                    saving ||
                    form.isAdmin
                  }
                >
                  <option value="">
                    Select a group
                  </option>

                  {groups.map((group) => (
                    <option
                      value={group.id}
                      key={group.id}
                    >
                      {group.name}
                    </option>
                  ))}
                </select>

                {groups.length === 0 && (
                  <small>
                    No active groups are
                    available.
                  </small>
                )}
              </div>

              {/* ADMIN */}

              <label className="permission-option">
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={(event) =>
                    handleAdminChange(
                      event.target.checked,
                    )
                  }
                  disabled={saving}
                />

                <span>
                  Administrator role
                </span>
              </label>

              <p className="form-help">
                Administrator roles bypass the
                normal group permission assignment.
              </p>

              {/* ACTIVE */}

              {!form.isAdmin && (
              <label className="permission-option">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                  disabled={saving}
                />

                <span>
                  Active
                </span>
              </label>
)}

              {/* PERMISSIONS */}

              {!form.isAdmin && (
                <div className="role-permissions-editor">
                  <div className="role-section-label">
                    ROLE PERMISSIONS
                  </div>

                  {!form.groupId && (
                    <p className="role-no-permissions">
                      Select a group to see the
                      permissions available to
                      this role.
                    </p>
                  )}

                  {loadingPermissions && (
                    <div className="permissions-loading">
                      Loading permissions...
                    </div>
                  )}

                  {!loadingPermissions &&
                    form.groupId &&
                    availablePermissions
                      .length === 0 && (
                      <p className="role-no-permissions">
                        This group has no child
                        permissions available.
                      </p>
                    )}

                  {!loadingPermissions &&
                    availablePermissions.map(
                      (groupPermission) => (
                        <div
                          className="permission-group"
                          key={
                            groupPermission.id
                          }
                        >
                          <div className="permission-group-title">
                            {groupPermission.name}
                          </div>

                          {groupPermission
                            .children.length ===
                          0 ? (
                            <p className="role-no-permissions">
                              No child
                              permissions.
                            </p>
                          ) : (
                            groupPermission.children.map(
                              (permission) => (
                                <label
                                  className="permission-option"
                                  key={
                                    permission.id
                                  }
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
                                    disabled={
                                      saving
                                    }
                                  />

                                  <span>
                                    {
                                      permission.name
                                    }
                                  </span>
                                </label>
                              ),
                            )
                          )}
                        </div>
                      ),
                    )}
                </div>
              )}
            </div>

            {/* ACTIONS */}

            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="button button-primary"
                onClick={saveRole}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingRole
                    ? "Save changes"
                    : "Create role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}