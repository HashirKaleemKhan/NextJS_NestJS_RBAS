"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type Permission = {
  id: number;
  name: string;
  parentId: number | null;
};

type GroupPermission = {
  permission: Permission;
};

type Group = {
  id: number;
  name: string;
  active: boolean;
  permissions: GroupPermission[];
  roles: any[];
};

export default function GroupsPage() {
  const router = useRouter();

  const [groups, setGroups] =
    useState<Group[]>([]);

  const [permissions, setPermissions] =
    useState<Permission[]>([]);

  const [name, setName] = useState("");

  const [selectedPermissions, setSelectedPermissions] =
    useState<number[]>([]);

  const [active, setActive] =
    useState(true);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [
        groupsResponse,
        permissionsResponse,
      ] = await Promise.all([
        api.get("/groups"),
        api.get("/roles/permissions"),
      ]);

      setGroups(
        groupsResponse.data,
      );

      setPermissions(
        permissionsResponse.data.filter(
          (permission: Permission) =>
            permission.parentId === null,
        ),
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load groups.",
      );
    } finally {
      setLoading(false);
    }
  }

  function togglePermission(
    id: number,
  ) {
    setSelectedPermissions(
      (current) =>
        current.includes(id)
          ? current.filter(
              (permissionId) =>
                permissionId !== id,
            )
          : [
              ...current,
              id,
            ],
    );
  }

  function resetForm() {
    setName("");
    setSelectedPermissions([]);
    setActive(true);
    setEditingId(null);
  }

  function startEdit(group: Group) {
    setEditingId(group.id);

    setName(group.name);

    setActive(group.active);

    setSelectedPermissions(
      group.permissions.map(
        (item) =>
          item.permission.id,
      ),
    );

    setSuccess("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveGroup(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!name.trim()) {
        setError(
          "Please enter a group name.",
        );
        return;
      }

      if (
        selectedPermissions.length === 0
      ) {
        setError(
          "Select at least one parent permission.",
        );
        return;
      }

      const payload = {
        name: name.trim(),
        active,
        permissionIds:
          selectedPermissions,
      };

      if (editingId) {
        await api.patch(
          `/groups/${editingId}`,
          payload,
        );

        setSuccess(
          "Group updated successfully.",
        );
      } else {
        await api.post(
          "/groups",
          payload,
        );

        setSuccess(
          "Group created successfully.",
        );
      }

      resetForm();

      await loadData();
            window.scrollTo({
  top: 0,
  behavior: "smooth",
});

    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to save group.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleGroup(group: Group) {
  try {
    setError("");
    setSuccess("");

    await api.patch(
      `/groups/${group.id}/status`,
    );

    setSuccess(
      group.active
        ? "Group deactivated successfully."
        : "Group activated successfully.",
    );

    await loadData();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  } catch (err: any) {
    setError(
      err?.response?.data?.message ||
        "Unable to update group.",
    );
  }
}

  async function deleteGroup(
    group: Group,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${group.name}"? This cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/groups/${group.id}`,
      );

      setSuccess(
        "Group deleted successfully.",
      );
      

      if (
        editingId === group.id
      ) {
        resetForm();
      }

      await loadData();
      window.scrollTo({
  top: 0,
  behavior: "smooth",
});
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete group.",
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="groups-page">

        {/* HEADER */}

        <div className="page-header">
          <div>
            <div className="page-eyebrow">
              ACCESS CONTROL
            </div>

            <h1>Groups</h1>

            <p>
              Organize application areas
              into groups for your roles.
            </p>
          </div>

          <button
            className="button button-secondary"
            onClick={() =>
              router.push("/dashboard")
            }
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="groups-alert groups-alert-error">
            {Array.isArray(error)
              ? error.join(", ")
              : error}
          </div>
        )}

        {success && (
          <div className="groups-alert groups-alert-success">
            ✓ {success}
          </div>
        )}

        {/* FORM */}

        <section className="groups-form-card">

          <div className="groups-section-heading">
            <div className="groups-section-icon">
              {editingId ? "✎" : "+"}
            </div>

            <div>
              <h2>
                {editingId
                  ? "Edit group"
                  : "Create group"}
              </h2>

              <p>
                {editingId
                  ? "Update this group's name, permissions or status."
                  : "Create a group and choose which application areas it can contain."}
              </p>
            </div>
          </div>

          <form
            onSubmit={saveGroup}
            className="groups-form"
          >

            {/* NAME */}

            <div className="groups-field">
              <label>
                Group name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value,
                  )
                }
                placeholder="e.g. Management"
              />
            </div>

            {/* PERMISSIONS */}

            <div className="groups-field">

              <div className="groups-field-label">
                <label>
                  Parent permissions
                </label>

                <span>
                  Select the application
                  areas this group can
                  contain.
                </span>
              </div>

              <div className="permission-grid">

                {permissions.map(
                  (permission) => {
                    const selected =
                      selectedPermissions.includes(
                        permission.id,
                      );

                    const label =
                      permission.name
                        .split(".")[0]
                        .replace(
                          /^./,
                          (char) =>
                            char.toUpperCase(),
                        );

                    return (
                      <button
                        key={
                          permission.id
                        }
                        type="button"
                        className={`permission-option ${
                          selected
                            ? "permission-option-selected"
                            : ""
                        }`}
                        onClick={() =>
                          togglePermission(
                            permission.id,
                          )
                        }
                      >
                        <span className="permission-check">
                          {selected
                            ? "✓"
                            : ""}
                        </span>

                        <span className="permission-option-content">
                          <strong>
                            {label}
                          </strong>

                          <small>
                            Application area
                          </small>
                        </span>
                      </button>
                    );
                  },
                )}

              </div>

              <div className="groups-help">
                Groups contain parent
                permissions only. Child
                permissions are selected
                later when creating a role.
              </div>
            </div>

            {/* STATUS */}

            <div className="groups-status-row">

              <div>
                <strong>
                  Group status
                </strong>

                <span>
                  {active
                    ? "This group can be assigned to roles."
                    : "This group is currently unavailable."}
                </span>
              </div>

              <button
                type="button"
                className={`status-toggle ${
                  active
                    ? "status-toggle-active"
                    : ""
                }`}
                onClick={() =>
                  setActive(
                    !active,
                  )
                }
              >
                <span className="status-toggle-dot" />

                {active
                  ? "Active"
                  : "Inactive"}
              </button>
            </div>

            {/* ACTIONS */}

            <div className="groups-form-actions">

              {editingId && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save changes"
                  : "Create group"}
              </button>

            </div>

          </form>
        </section>

        {/* EXISTING GROUPS */}

        <section className="groups-existing">

          <div className="groups-existing-header">

            <div>
              <div className="page-eyebrow">
                CONFIGURATION
              </div>

              <h2>
                Existing groups
              </h2>

              <p>
                Manage the groups currently
                available to your roles.
              </p>
            </div>

            <div className="groups-count">
              {groups.length}{" "}
              {groups.length === 1
                ? "group"
                : "groups"}
            </div>

          </div>

          {loading ? (
            <div className="groups-loading">
              Loading groups...
            </div>
          ) : groups.length === 0 ? (
            <div className="groups-empty">
              <strong>
                No groups configured
              </strong>

              <span>
                Create your first access
                control group above.
              </span>
            </div>
          ) : (
            <div className="groups-list">

              {groups.map(
                (group) => (
                  <div
                    key={group.id}
                    className="group-management-card"
                  >

                    <div className="group-card-main">

                      <div className="group-card-title-row">

                        <div>
                          <h3>
                            {group.name}
                          </h3>

                          <p>
                            Access control group
                          </p>
                        </div>

                        <span
                          className={`group-status ${
                            group.active
                              ? "group-status-active"
                              : "group-status-inactive"
                          }`}
                        >
                          <span />
                          {group.active
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </div>

                      <div className="group-card-permissions">

                        <span className="group-card-label">
                          Parent permissions
                        </span>

                        <div className="group-permission-list">

                          {group.permissions.map(
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
                          )}

                        </div>

                      </div>

                    </div>

                    <div className="group-card-footer">

                      <span className="group-role-count">
                        <strong>
                          {group.roles.length}
                        </strong>{" "}
                        {group.roles.length ===
                        1
                          ? "role"
                          : "roles"}{" "}
                        assigned
                      </span>

                      <div className="group-card-actions">

                        <button
                          className="group-action group-action-edit"
                          onClick={() =>
                            startEdit(
                              group,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="group-action"
                          onClick={() =>
                            toggleGroup(
                              group,
                            )
                          }
                        >
                          {group.active
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          className="group-action group-action-danger"
                          onClick={() =>
                            deleteGroup(
                              group,
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

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