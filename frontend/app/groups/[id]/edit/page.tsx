"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { gql } from "@apollo/client";
import {
  useMutation,
  useQuery,
} from "@apollo/client/react";

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
  roles: {
    id: number;
    name: string;
  }[];
};

type GroupQueryData = {
  group: Group;
};

type GroupQueryVariables = {
  id: number;
};

type PermissionsQueryData = {
  roleAllPermissions: Permission[];
};

type UpdateGroupMutationData = {
  updateGroup: {
    id: number;
    name: string;
    active: boolean;
  };
};

type UpdateGroupMutationVariables = {
  id: number;
  input: {
    name: string;
    active: boolean;
    permissionIds: number[];
  };
};

const GROUP_QUERY = gql`
  query Group($id: Int!) {
    group(id: $id) {
      id
      name
      active

      permissions {
        permission {
          id
          name
          parentId
        }
      }

      roles {
        id
        name
      }
    }
  }
`;

const ROLE_ALL_PERMISSIONS_QUERY = gql`
  query RoleAllPermissions {
    roleAllPermissions {
      id
      name
      parentId
    }
  }
`;

const UPDATE_GROUP_MUTATION = gql`
  mutation UpdateGroup(
    $id: Int!
    $input: UpdateGroupInput!
  ) {
    updateGroup(
      id: $id
      input: $input
    ) {
      id
      name
      active
    }
  }
`;

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();

  const groupId = Number(params.id);

  const [name, setName] = useState("");

  const [selectedPermissions, setSelectedPermissions] =
    useState<number[]>([]);

  const [active, setActive] =
    useState(true);

  const [error, setError] =
    useState("");

  const {
    data: groupData,
    loading: groupLoading,
    error: groupQueryError,
  } = useQuery<
    GroupQueryData,
    GroupQueryVariables
  >(GROUP_QUERY, {
    variables: {
      id: groupId,
    },
    skip:
      !groupId ||
      Number.isNaN(groupId),
    fetchPolicy: "network-only",
  });

  const {
    data: permissionsData,
    loading: permissionsLoading,
    error: permissionsQueryError,
  } = useQuery<PermissionsQueryData>(
    ROLE_ALL_PERMISSIONS_QUERY,
    {
      fetchPolicy: "network-only",
    },
  );

  const [
    updateGroupMutation,
    {
      loading: saving,
    },
  ] = useMutation<
    UpdateGroupMutationData,
    UpdateGroupMutationVariables
  >(UPDATE_GROUP_MUTATION);

  const group = groupData?.group ?? null;

  const permissions =
    permissionsData?.roleAllPermissions?.filter(
      (permission) =>
        permission.parentId === null,
    ) || [];

  useEffect(() => {
    if (
      !groupId ||
      Number.isNaN(groupId)
    ) {
      setError("Invalid group ID.");
      return;
    }

    if (group) {
      setName(group.name);
      setActive(group.active);

      setSelectedPermissions(
        group.permissions.map(
          (item) =>
            item.permission.id,
        ),
      );
    }
  }, [group, groupId]);

  useEffect(() => {
    if (groupQueryError) {
      console.error(
        "Unable to load group:",
        groupQueryError,
      );

      setError(
        groupQueryError.message ||
          "Unable to load group.",
      );
    }
  }, [groupQueryError]);

  useEffect(() => {
    if (permissionsQueryError) {
      console.error(
        "Unable to load permissions:",
        permissionsQueryError,
      );

      setError(
        permissionsQueryError.message ||
          "Unable to load permissions.",
      );
    }
  }, [permissionsQueryError]);

  function togglePermission(id: number) {
    setSelectedPermissions((current) =>
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
      await updateGroupMutation({
        variables: {
          id: groupId,
          input: {
            name: name.trim(),
            active,
            permissionIds:
              selectedPermissions,
          },
        },
      });

      router.replace(
        "/groups?success=updated",
      );
    } catch (err: any) {
      console.error(
        "Unable to update group:",
        err,
      );

      setError(
        err?.message ||
          "Unable to update group.",
      );
    }
  }

  const loading =
    groupLoading ||
    permissionsLoading;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="company-page-loading">
          <div className="company-loading-spinner" />
          <span>
            Loading group...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout>
        <div className="company-groups-edit-page">

          <div className="company-page-header">
            <div>
              <div className="company-page-eyebrow">
                ACCESS CONTROL
              </div>

              <h1>
                Edit group
              </h1>

              <p>
                Update group configuration
                and permissions.
              </p>
            </div>

            <div className="company-page-actions">
              <button
                type="button"
                className="company-secondary-button"
                onClick={() =>
                  router.push("/groups")
                }
              >
                ← Back to groups
              </button>
            </div>
          </div>

          <div className="company-users-error">
            {error ||
              "Group not found."}
          </div>

        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="company-groups-edit-page">

        {/* HEADER */}

        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              ACCESS CONTROL
            </div>

            <h1>
              Edit group
            </h1>

            <p>
              Update {group.name}'s permissions
              and status.
            </p>
          </div>

          <div className="company-page-actions">
            <button
              type="button"
              className="company-secondary-button"
              onClick={() =>
                router.push("/groups")
              }
              disabled={saving}
            >
              ← Back to groups
            </button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="company-users-error">
            {error}
          </div>
        )}

        {/* FORM PANEL */}

        <section className="company-groups-edit-panel">

          {/* PANEL HEADER */}

          <div className="company-groups-edit-panel-header">

            <div className="company-groups-edit-heading-icon">
              ✎
            </div>

            <div>
              <div className="company-panel-eyebrow">
                GROUP CONFIGURATION
              </div>

              <h2>
                Group information
              </h2>

              <p>
                Update the group's name,
                permissions, and availability.
              </p>
            </div>

          </div>

          <form
            onSubmit={saveGroup}
            className="company-groups-edit-form"
          >

            {/* GROUP NAME */}

            <div className="company-groups-edit-field">

              <label htmlFor="group-name">
                Group name
              </label>

              <input
                id="group-name"
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="e.g. Management"
                disabled={saving}
                required
              />

              <small>
                Choose a clear name that describes
                the group.
              </small>

            </div>

            {/* PERMISSIONS */}

            <div className="company-groups-edit-field">

              <div className="company-groups-edit-field-header">

                <div>
                  <label>
                    Parent permissions
                  </label>

                  <small>
                    Select the application areas
                    this group can contain.
                  </small>
                </div>

                <span className="company-groups-selected-count">
                  {selectedPermissions.length} selected
                </span>

              </div>

              <div className="company-groups-permission-grid">

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
                        key={permission.id}
                        type="button"
                        disabled={saving}
                        className={`company-groups-permission-option ${
                          selected
                            ? "company-groups-permission-option-selected"
                            : ""
                        }`}
                        onClick={() =>
                          togglePermission(
                            permission.id,
                          )
                        }
                      >
                        <span className="company-groups-permission-check">
                          {selected
                            ? "✓"
                            : ""}
                        </span>

                        <span className="company-groups-permission-content">
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

              <div className="company-groups-edit-help">
                <span>
                  ⓘ
                </span>

                <span>
                  Groups contain parent permissions
                  only. Child permissions are selected
                  later when configuring a role.
                </span>
              </div>

            </div>

            {/* STATUS */}

            <div className="company-groups-status-card">

              <div className="company-groups-status-copy">

                <div className="company-groups-status-title">
                  Group status
                </div>

                <div className="company-groups-status-description">
                  {active
                    ? "This group can be assigned to roles."
                    : "This group is currently unavailable."}
                </div>

              </div>

              <button
                type="button"
                disabled={saving}
                className={`company-groups-status-toggle ${
                  active
                    ? "company-groups-status-toggle-active"
                    : ""
                }`}
                onClick={() =>
                  setActive(!active)
                }
              >
                <span className="company-groups-status-toggle-dot" />

                {active
                  ? "Active"
                  : "Inactive"}
              </button>

            </div>

            {/* ACTIONS */}

            <div className="company-groups-edit-actions">

              <button
                type="button"
                className="company-secondary-button"
                onClick={() =>
                  router.push("/groups")
                }
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
                  : "Save changes"}
              </button>

            </div>

          </form>

        </section>

      </div>
    </DashboardLayout>
  );
}