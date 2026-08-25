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

export default function CreateGroupPage() {
  const router = useRouter();

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
  // LOAD PERMISSIONS
  // -----------------------------------

  useEffect(() => {
    loadPermissions();
  }, []);

  async function loadPermissions() {
    try {
      const response =
        await api.get(
          "/roles/permissions",
        );

      setPermissions(
        response.data.filter(
          (permission: Permission) =>
            permission.parentId === null,
        ),
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load permissions.",
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
  // CREATE
  // -----------------------------------

  async function createGroup(
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

      await api.post("/groups", {
        name: name.trim(),
        active,
        permissionIds:
          selectedPermissions,
      });

      router.push("/groups?success=created");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to create group.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>

      <div className="groups-page">

        <div className="page-header">

          <div>
            <div className="page-eyebrow">
              ACCESS CONTROL
            </div>

            <h1>Create group</h1>

            <p>
              Create a new application
              access-control group.
            </p>
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

        {error && (
          <div className="groups-alert groups-alert-error">
            {Array.isArray(error)
              ? error.join(", ")
              : error}
          </div>
        )}

        <section className="groups-form-card">

          <div className="groups-section-heading">

            <div className="groups-section-icon">
              +
            </div>

            <div>
              <h2>
                Group information
              </h2>

              <p>
                Define the group and its
                application areas.
              </p>
            </div>

          </div>

          <form
            onSubmit={createGroup}
            className="groups-form"
          >

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
                required
              />

            </div>

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

                {loading ? (
                  <div>
                    Loading permissions...
                  </div>
                ) : (
                  permissions.map(
                    (permission) => {
                      const selected =
                        selectedPermissions.includes(
                          permission.id,
                        );

                      const label =
                        permission.name
                          .split(
                            ".",
                          )[0]
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
                  )
                )}

              </div>

            </div>

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
                  setActive(!active)
                }
              >
                <span className="status-toggle-dot" />

                {active
                  ? "Active"
                  : "Inactive"}
              </button>

            </div>

            <div className="groups-form-actions">

              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  router.push("/groups")
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button button-primary"
                disabled={
                  saving ||
                  loading
                }
              >
                {saving
                  ? "Creating..."
                  : "Create group"}
              </button>

            </div>

          </form>

        </section>

      </div>

    </DashboardLayout>
  );
}