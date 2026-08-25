"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();

  const groupId = Number(params.id);

  const [group, setGroup] =
    useState<Group | null>(null);

  const [permissions, setPermissions] =
    useState<Permission[]>([]);

  const [name, setName] = useState("");

  const [selectedPermissions, setSelectedPermissions] =
    useState<number[]>([]);

  const [active, setActive] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // -----------------------------------
  // LOAD GROUP + PERMISSIONS
  // -----------------------------------

  useEffect(() => {
    if (!groupId || Number.isNaN(groupId)) {
      setError("Invalid group ID.");
      setLoading(false);
      return;
    }

    loadData();
  }, [groupId]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        groupResponse,
        permissionsResponse,
      ] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get("/roles/permissions"),
      ]);

      const loadedGroup: Group =
        groupResponse.data;

      setGroup(loadedGroup);

      setName(loadedGroup.name);

      setActive(loadedGroup.active);

      setSelectedPermissions(
        loadedGroup.permissions.map(
          (item) =>
            item.permission.id,
        ),
      );

      setPermissions(
        permissionsResponse.data.filter(
          (permission: Permission) =>
            permission.parentId === null,
        ),
      );
    } catch (err: any) {
      console.error(
        "Unable to load group:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load group.",
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------
  // TOGGLE PERMISSION
  // -----------------------------------

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

  // -----------------------------------
  // SAVE
  // -----------------------------------

  async function saveGroup(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setError("");

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

    try {
      setSaving(true);

      await api.patch(
        `/groups/${groupId}`,
        {
          name: name.trim(),
          active,
          permissionIds:
            selectedPermissions,
        },
      );

      router.push("/groups?success=updated");
    } catch (err: any) {
      console.error(
        "Unable to update group:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Unable to update group.",
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
      <DashboardLayout>
        <div className="page-loading">
          Loading group...
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // ERROR / NOT FOUND
  // -----------------------------------

  if (!group) {
    return (
      <DashboardLayout>
        <div className="groups-page">

          <div className="page-header">
            <div>
              <div className="page-eyebrow">
                ACCESS CONTROL
              </div>

              <h1>Edit group</h1>
            </div>

            <button
              className="button button-secondary"
              onClick={() =>
                router.push("/groups")
              }
            >
              ← Back to groups
            </button>
          </div>

          <div className="groups-alert groups-alert-error">
            {error ||
              "Group not found."}
          </div>

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

        {/* HEADER */}

        <div className="page-header">

          <div>

            <div className="page-eyebrow">
              ACCESS CONTROL
            </div>

            <h1>
              Edit group
            </h1>

            <p>
              Update {group.name}'s
              permissions and status.
            </p>

          </div>

          <button
            className="button button-secondary"
            onClick={() =>
              router.push("/groups")
            }
            disabled={saving}
          >
            ← Back to groups
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="groups-alert groups-alert-error">
            {Array.isArray(error)
              ? error.join(", ")
              : error}
          </div>
        )}

        {/* FORM */}

        <section className="groups-form-card">

          <div className="groups-section-heading">

            <div className="groups-section-icon">
              ✎
            </div>

            <div>

              <h2>
                Group information
              </h2>

              <p>
                Update the group's
                configuration.
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
                disabled={saving}
                required
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
                        disabled={saving}
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
                disabled={saving}
                className={`status-toggle ${
                  active
                    ? "status-toggle-active"
                    : ""
                }`}
                onClick={() =>
                  setActive(!active)
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

              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  router.push("/groups")
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>

            </div>

          </form>

        </section>

      </div>

    </DashboardLayout>
  );
}