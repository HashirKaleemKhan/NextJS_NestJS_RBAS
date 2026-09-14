"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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

type Role = {
  id: number;
  name: string;
  groupId: number | null;
  reportsToRoleId: number | null;
  active: boolean;
  isAdmin: boolean;
  permissions?: {
    permission: Permission;
  }[];
};

type RoleFormData = {
  name: string;
  groupId: number | null;
  reportsToRoleId: number | null;
  active: boolean;
  isAdmin: boolean;
};

type RoleFormProps = {
  mode: "create" | "edit";
  role?: Role | null;
  onSuccess: (message: string) => void;
};

export default function RoleForm({
  mode,
  role,
  onSuccess,
}: RoleFormProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [form, setForm] =
    useState<RoleFormData>({
      name: role?.name || "",
      groupId: role?.groupId ?? null,
      reportsToRoleId:
        role?.reportsToRoleId ?? null,
      active: role?.active ?? true,
      isAdmin: role?.isAdmin ?? false,
    });

  const [availablePermissions, setAvailablePermissions] =
    useState<GroupPermission[]>([]);

  const [selectedPermissions, setSelectedPermissions] =
    useState<number[]>(
      role?.permissions?.map(
        (item) => item.permission.id,
      ) || [],
    );

  const [loading, setLoading] =
    useState(true);

  const [loadingPermissions, setLoadingPermissions] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [previousGroupId, setPreviousGroupId] =
    useState<number | null>(
      role?.groupId ?? null,
    );

  /*
   * Parent permission currently expanded.
   *
   * null = all collapsed
   */
  const [expandedPermissionGroup, setExpandedPermissionGroup] =
    useState<number | null>(null);

  // -----------------------------------
  // LOAD GROUPS + ROLES
  // -----------------------------------

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (
      form.groupId !== null &&
      !form.isAdmin
    ) {
      loadGroupPermissions(
        form.groupId,
        mode === "edit"
          ? role?.permissions?.map(
              (item) =>
                item.permission.id,
            ) || []
          : [],
      );
    }
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

          const rolesResponse =
          await api.get<{
            data: Role[];
            pagination: {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            };
          }>("/roles", {
            params: {
              page: 1,
              limit: 100,
            },
          });

        setRoles(rolesResponse.data.data);

      const [
        groupsResponse,
      ] = await Promise.all([
        api.get("/roles/groups")
      ]);

      setGroups(groupsResponse.data);
  
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load role data.",
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

      const groupPermissions =
        response.data as GroupPermission[];

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
        existingPermissionIds.filter(
          (id) =>
            availableIds.includes(id),
        ),
      );

      /*
       * Start with all parent permissions
       * collapsed.
       */
      setExpandedPermissionGroup(null);
    } catch (err: any) {
      setAvailablePermissions([]);
      setSelectedPermissions([]);
      setExpandedPermissionGroup(null);

      setError(
        err?.response?.data?.message ||
          "Unable to load group permissions.",
      );
    } finally {
      setLoadingPermissions(false);
    }
  }

  // -----------------------------------
  // GROUP CHANGE
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
    setExpandedPermissionGroup(null);

    if (groupId === null) {
      return;
    }

    await loadGroupPermissions(groupId);
  }

  // -----------------------------------
  // ADMIN CHANGE
  // -----------------------------------

  async function handleAdminChange(
    isAdmin: boolean,
  ) {
    if (isAdmin) {
      setPreviousGroupId(
        form.groupId,
      );

      setForm((current) => ({
        ...current,
        isAdmin: true,
        groupId: null,
        reportsToRoleId: null,
      }));

      setAvailablePermissions([]);
      setSelectedPermissions([]);
      setExpandedPermissionGroup(null);

      return;
    }

    const restoredGroupId =
      previousGroupId;

    setForm((current) => ({
      ...current,
      isAdmin: false,
      groupId: restoredGroupId,
      reportsToRoleId: null,
    }));

    if (restoredGroupId !== null) {
      await loadGroupPermissions(
        restoredGroupId,
        role?.permissions?.map(
          (item) =>
            item.permission.id,
        ) || [],
      );
    }
  }

  // -----------------------------------
  // TOGGLE PARENT PERMISSION
  // -----------------------------------

  function togglePermissionGroup(
    groupId: number,
  ) {
    setExpandedPermissionGroup(
      (current) =>
        current === groupId
          ? null
          : groupId,
    );
  }

  // -----------------------------------
  // TOGGLE CHILD PERMISSION
  // -----------------------------------

  function togglePermission(
    permissionId: number,
  ) {
    setSelectedPermissions(
      (current) => {
        if (
          current.includes(permissionId)
        ) {
          return current.filter(
            (id) =>
              id !== permissionId,
          );
        }

        return [
          ...current,
          permissionId,
        ];
      },
    );
  }

  // -----------------------------------
  // SAVE
  // -----------------------------------

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError(
        "Role name is required.",
      );
      return;
    }

    if (
      !form.isAdmin &&
      !form.groupId
    ) {
      setError(
        "A group is required for non-administrator roles.",
      );
      return;
    }

    if (
      !form.isAdmin &&
      !form.reportsToRoleId
    ) {
      setError(
        "A non-administrator role must report to another role.",
      );
      return;
    }

    if (
      !form.isAdmin &&
      mode === "edit" &&
      role &&
      form.reportsToRoleId === role.id
    ) {
      setError(
        "A role cannot report to itself.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),

        groupId: form.isAdmin
          ? null
          : form.groupId,

        reportsToRoleId:
          form.isAdmin
            ? null
            : form.reportsToRoleId,

        active: form.active,

        isAdmin: form.isAdmin,

        permissionIds:
          form.isAdmin
            ? []
            : selectedPermissions,
      };

      if (mode === "create") {
        await api.post(
          "/roles",
          payload,
        );

        onSuccess(
          "Role created successfully.",
        );

        return;
      }

      if (!role) {
        throw new Error(
          "Role not found.",
        );
      }

      await api.patch(
        `/roles/${role.id}`,
        payload,
      );

      onSuccess(
        "Role updated successfully.",
      );
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
  // LOADING
  // -----------------------------------

    if (loading) {
    return (
      <div className="company-page-loading">
        <div className="company-loading-spinner" />
        <span>Loading role form...</span>
      </div>
    );
  }

  return (
    <form
      className="company-role-form"
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="company-users-error company-role-form-error">
          {error}
        </div>
      )}

      {/* ROLE SETTINGS */}
      <div className="company-role-form-section">
        {/* <div className="company-role-section-heading">
          <div>
            <div className="company-panel-eyebrow">
              ROLE SETTINGS
            </div>

            <h3>Role information</h3>

            <p>
              Define the role and its position in
              the organization.
            </p>
          </div>
        </div> */}

        <div className="company-role-settings-grid">
          <div className="company-role-form-group">
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
                  name: event.target.value,
                }))
              }
              placeholder="e.g. HR Manager"
              disabled={saving}
            />
          </div>

          <div className="company-role-form-group">
            <label htmlFor="role-group">
              Group
            </label>

            <select
              id="role-group"
              value={form.groupId ?? ""}
              onChange={(event) => {
                const value = event.target.value;

                handleGroupChange(
                  value ? Number(value) : null,
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
                  key={group.id}
                  value={group.id}
                >
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {!form.isAdmin && (
            <div className="company-role-form-group">
              <label htmlFor="role-reports-to">
                Reports to
              </label>

              <select
                id="role-reports-to"
                value={
                  form.reportsToRoleId ?? ""
                }
                onChange={(event) => {
                  const value =
                    event.target.value;

                  setForm((current) => ({
                    ...current,
                    reportsToRoleId:
                      value
                        ? Number(value)
                        : null,
                  }));
                }}
                disabled={saving}
              >
                <option value="">
                  Select reporting role
                </option>

                {roles
                  .filter(
                    (item) =>
                      item.id !== role?.id,
                  )
                  .map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  ))}
              </select>

              <small>
                Users with this role must report
                to a user with the selected role.
              </small>
            </div>
          )}

          {!form.isAdmin && (
            <div className="company-role-status-card">
              <label className="company-role-check-option">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active:
                        event.target.checked,
                    }))
                  }
                  disabled={saving}
                />

                <span className="company-role-custom-check">
                  {form.active ? "✓" : ""}
                </span>

                <span>
                  <strong>Active</strong>
                  <small>
                    Inactive roles cannot be assigned
                    to new users.
                  </small>
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ADMINISTRATOR */}
      <div className="company-role-admin-card">
        <label className="company-role-check-option">
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

          <span className="company-role-custom-check">
            {form.isAdmin ? "✓" : ""}
          </span>

          <span>
            <strong>Administrator role</strong>

            <small>
              Administrator roles bypass normal
              group permission assignment.
            </small>
          </span>
        </label>
      </div>

      {/* PERMISSIONS */}
      {!form.isAdmin && (
        <div className="company-role-permissions">
          <div className="company-role-section-heading">
            <div>
              <div className="company-panel-eyebrow">
                ROLE PERMISSIONS
              </div>

              <h3>Permissions</h3>

              <p>
                Select the permissions this role
                should have. Click a permission
                category to view its actions.
              </p>
            </div>

            <div className="company-role-permission-total">
              {selectedPermissions.length} selected
            </div>
          </div>

          {!form.groupId && (
            <div className="company-role-empty-permissions">
              <div className="company-role-empty-icon">
                +
              </div>

              <div>
                <strong>Select a group first</strong>

                <p>
                  Choose a group above to see the
                  permissions available to this
                  role.
                </p>
              </div>
            </div>
          )}

          {loadingPermissions && (
            <div className="company-role-permissions-loading">
              <div className="company-loading-spinner" />
              <span>
                Loading permissions...
              </span>
            </div>
          )}

          {!loadingPermissions &&
            form.groupId &&
            availablePermissions.length ===
              0 && (
              <div className="company-role-empty-permissions">
                <div className="company-role-empty-icon">
                  —
                </div>

                <div>
                  <strong>
                    No permissions available
                  </strong>

                  <p>
                    This group has no child
                    permissions available.
                  </p>
                </div>
              </div>
            )}

          {!loadingPermissions &&
            availablePermissions.length > 0 && (
              <div className="company-permissions-browser">
                <div className="company-permission-category-list">
                  {availablePermissions.map(
                    (groupPermission) => {
                      const isExpanded =
                        expandedPermissionGroup ===
                        groupPermission.id;

                      const selectedCount =
                        groupPermission.children.filter(
                          (permission) =>
                            selectedPermissions.includes(
                              permission.id,
                            ),
                        ).length;

                      return (
                        <button
                          key={
                            groupPermission.id
                          }
                          type="button"
                          className={`company-permission-category ${
                            isExpanded
                              ? "is-expanded"
                              : ""
                          } ${
                            selectedCount > 0
                              ? "has-selection"
                              : ""
                          }`}
                          onClick={() =>
                            togglePermissionGroup(
                              groupPermission.id,
                            )
                          }
                          disabled={saving}
                        >
                          <span className="company-permission-category-main">
                            <span className="company-permission-category-icon">
                              {isExpanded
                                ? "−"
                                : "+"}
                            </span>

                            <span>
                              <strong>
                                {
                                  groupPermission.name
                                }
                              </strong>

                              <small>
                                {
                                  groupPermission
                                    .children
                                    .length
                                }{" "}
                                permission
                                {groupPermission
                                  .children
                                  .length !== 1
                                  ? "s"
                                  : ""}
                              </small>
                            </span>
                          </span>

                          <span className="company-permission-count">
                            {selectedCount > 0
                              ? `${selectedCount}/${groupPermission.children.length}`
                              : groupPermission.children.length}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                {expandedPermissionGroup !==
                  null && (
                  <div className="company-permission-children-panel">
                    {availablePermissions
                      .filter(
                        (groupPermission) =>
                          groupPermission.id ===
                          expandedPermissionGroup,
                      )
                      .map(
                        (groupPermission) => (
                          <div
                            key={
                              groupPermission.id
                            }
                            className="company-permission-children-content"
                          >
                            <div className="company-permission-children-header">
                              <div>
                                <div className="company-permission-children-title">
                                  {
                                    groupPermission.name
                                  }
                                </div>

                                <div className="company-permission-children-subtitle">
                                  Select the actions
                                  available under
                                  this permission
                                  category.
                                </div>
                              </div>

                              <div className="company-permission-selected-count">
                                {
                                  groupPermission
                                    .children
                                    .filter(
                                      (
                                        permission,
                                      ) =>
                                        selectedPermissions.includes(
                                          permission.id,
                                        ),
                                    ).length
                                }{" "}
                                selected
                              </div>
                            </div>

                            {groupPermission
                              .children
                              .length === 0 ? (
                              <div className="company-role-empty-child">
                                No child permissions.
                              </div>
                            ) : (
                              <div className="company-permission-child-grid">
                                {groupPermission.children.map(
                                  (
                                    permission,
                                  ) => {
                                    const checked =
                                      selectedPermissions.includes(
                                        permission.id,
                                      );

                                    return (
                                      <label
                                        key={
                                          permission.id
                                        }
                                        className={`company-permission-child ${
                                          checked
                                            ? "is-selected"
                                            : ""
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={
                                            checked
                                          }
                                          onChange={() =>
                                            togglePermission(
                                              permission.id,
                                            )
                                          }
                                          disabled={
                                            saving
                                          }
                                        />

                                        <span className="company-permission-child-check">
                                          {checked
                                            ? "✓"
                                            : ""}
                                        </span>

                                        <span className="company-permission-child-name">
                                          {
                                            permission.name
                                          }
                                        </span>
                                      </label>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* ACTIONS */}
      <div className="company-role-form-actions">
        <button
          type="button"
          className="company-secondary-button"
          onClick={() => window.history.back()}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="company-primary-button"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : mode === "create"
              ? "Create role"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}