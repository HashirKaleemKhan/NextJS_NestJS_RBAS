"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { graphqlRequest } from "@/lib/graphql";
import { logout } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type Permission = {
  id: number;
  name: string;
};

type GroupPermission = {
  permission: Permission;
};

type GroupRole = {
  id: number;
  name: string;
};

type Group = {
  id: number;
  name: string;
  active: boolean;
  permissions: GroupPermission[];
  roles: GroupRole[];
};

type GroupsQueryResponse = {
  groups: Group[];
};

type DeleteGroupResponse = {
  deleteGroup: {
    message: string;
  };
};

type ToggleGroupResponse = {
  toggleGroupStatus: Group;
};

const GROUPS_QUERY = `
  query {
    groups {
      id
      name
      active
      permissions {
        groupId
        permissionId
        permission {
          id
          name
        }
      }
      roles {
        id
        name
        groupId
        reportsToRoleId
        active
        isAdmin
      }
    }
  }
`;

const DELETE_GROUP_MUTATION = `
  mutation DeleteGroup($id: Int!) {
    deleteGroup(id: $id) {
      message
    }
  }
`;

const TOGGLE_GROUP_STATUS_MUTATION = `
  mutation ToggleGroupStatus($id: Int!) {
    toggleGroupStatus(id: $id) {
      id
      name
      active
      permissions {
        groupId
        permissionId
        permission {
          id
          name
        }
      }
      roles {
        id
        name
        groupId
        reportsToRoleId
        active
        isAdmin
      }
    }
  }
`;

export default function GroupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const success = searchParams.get("success");

  // -----------------------------------
  // AUTH + LOAD
  // -----------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    loadGroups();
  }, [router]);

  // -----------------------------------
  // SUCCESS MESSAGE
  // -----------------------------------

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace("/groups");
    }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [success, router]);

  // -----------------------------------
  // LOAD GROUPS
  // -----------------------------------

  async function loadGroups() {
    try {
      setLoading(true);
      setError("");

      const response =
        await graphqlRequest<GroupsQueryResponse>(
          GROUPS_QUERY,
        );

      setGroups(response.groups);
    } catch (err: any) {
      console.error("Unable to load groups:", err);

      setError(
        err?.message ||
          "Unable to load groups.",
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------
  // DELETE GROUP
  // -----------------------------------

  async function deleteGroup(group: Group) {
    const confirmed = window.confirm(
      `Delete "${group.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await graphqlRequest<DeleteGroupResponse>(
        DELETE_GROUP_MUTATION,
        {
          id: group.id,
        },
      );

      await loadGroups();

      router.replace(
        "/groups?success=deleted",
      );
    } catch (err: any) {
      console.error("Unable to delete group:", err);

      setError(
        err?.message ||
          "Unable to delete group.",
      );
    }
  }

  // -----------------------------------
  // TOGGLE GROUP STATUS
  // -----------------------------------

  async function toggleGroup(group: Group) {
    try {
      setError("");

      await graphqlRequest<ToggleGroupResponse>(
        TOGGLE_GROUP_STATUS_MUTATION,
        {
          id: group.id,
        },
      );

      await loadGroups();

      router.replace(
        `/groups?success=${
          group.active
            ? "deactivated"
            : "activated"
        }`,
      );
    } catch (err: any) {
      console.error(
        "Unable to update group status:",
        err,
      );

      setError(
        err?.message ||
          "Unable to update group status.",
      );
    }
  }

  // -----------------------------------
  // SUCCESS MESSAGE TEXT
  // -----------------------------------

  function getSuccessMessage() {
    switch (success) {
      case "created":
        return "Group created successfully.";

      case "updated":
        return "Group updated successfully.";

      case "deleted":
        return "Group deleted successfully.";

      case "activated":
        return "Group activated successfully.";

      case "deactivated":
        return "Group deactivated successfully.";

      default:
        return "";
    }
  }

  // -----------------------------------
  // COUNTS
  // -----------------------------------

  const totalGroups = groups.length;

  const activeGroups = groups.filter(
    (group) => group.active,
  ).length;

  const inactiveGroups = groups.filter(
    (group) => !group.active,
  ).length;

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Loading groups...
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
              GROUP MANAGEMENT
            </div>

            <h1>Groups</h1>

            <p>
              Manage application groups and
              their permissions.
            </p>
          </div>

          <div className="page-header-actions">

            <button
              className="button button-primary"
              onClick={() =>
                router.push(
                  "/groups/create",
                )
              }
            >
              + Create group
            </button>

            <button
              className="button button-secondary"
              onClick={logout}
            >
              Logout
            </button>

          </div>
        </div>

        {/* SUCCESS */}

        {success && getSuccessMessage() && (
          <div className="groups-alert groups-alert-success">
            ✓ {getSuccessMessage()}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="groups-alert groups-alert-error">
            {error}
          </div>
        )}

        {/* GROUP STATS */}

        <div className="stats-grid">

          {/* TOTAL */}

          <div className="stat-card stat-card-total">
            <div className="stat-card-content">

              <span className="stat-card-label">
                Total
              </span>

              <strong className="stat-card-value">
                {totalGroups}
              </strong>

              <span className="stat-card-description">
                Total groups
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
                {activeGroups}
              </strong>

              <span className="stat-card-description">
                Available groups
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
                {inactiveGroups}
              </strong>

              <span className="stat-card-description">
                Disabled groups
              </span>

            </div>
          </div>

        </div>

        {/* EXISTING GROUPS */}

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
              Existing groups
            </h2>

            <p>
              Manage groups currently
              available to your roles.
            </p>
          </div>

          {/* EMPTY */}

          {groups.length === 0 ? (
            <div className="empty-state">

              <div className="empty-icon">
                ◉
              </div>

              <h3>
                No groups configured
              </h3>

              <p>
                Create your first group
                to get started.
              </p>

              <button
                className="button button-primary"
                onClick={() =>
                  router.push(
                    "/groups/create",
                  )
                }
              >
                Create group
              </button>

            </div>
          ) : (

            /* TABLE */

            <div className="table-wrapper">

              <table className="users-table">

                <thead>
                  <tr>

                    <th>
                      GROUP
                    </th>

                    <th>
                      PERMISSIONS
                    </th>

                    <th>
                      ROLES
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

                  {groups.map(
                    (group) => (
                      <tr
                        key={
                          group.id
                        }
                      >

                        {/* GROUP */}

                        <td>
                          <div className="user-cell">

                            <div className="user-avatar">
                              {group.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>

                              <div className="user-name">
                                {group.name}
                              </div>

                              <div className="user-id">
                                ID #{group.id}
                              </div>

                            </div>

                          </div>
                        </td>

                        {/* PERMISSIONS */}

                        <td>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >

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
                                    .split(".")[0]
                                    .replace(
                                      /^./,
                                      (char) =>
                                        char.toUpperCase(),
                                    )}
                                </span>

                              ),
                            )}

                          </div>

                        </td>

                        {/* ROLES */}

                        <td>

                          <span>
                            {
                              group.roles.length
                            }{" "}
                            {
                              group.roles.length ===
                              1
                                ? "role"
                                : "roles"
                            }
                          </span>

                        </td>

                        {/* STATUS */}

                        <td>

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

                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div className="user-actions">

                            {/* EDIT */}

                            <button
                              className="edit-button"
                              onClick={() =>
                                router.push(
                                  `/groups/${group.id}/edit`,
                                )
                              }
                            >
                              Edit
                            </button>

                            {/* STATUS */}

                            <button
                              className="edit-button"
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

                            {/* DELETE */}

                            <button
                              className="delete-button"
                              onClick={() =>
                                deleteGroup(
                                  group,
                                )
                              }
                            >
                              Delete
                            </button>

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
