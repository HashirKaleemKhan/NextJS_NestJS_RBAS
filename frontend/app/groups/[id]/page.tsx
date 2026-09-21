"use client";

import { useParams, useRouter } from "next/navigation";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

import DashboardLayout from "@/components/layouts/DashboardLayout";

type Permission = {
  id: number;
  name: string;
  parentId: number | null;
};

type GroupPermission = {
  permission: Permission;
};

type Role = {
  id: number;
  name: string;
  isAdmin: boolean;
  active: boolean;
};

type Group = {
  id: number;
  name: string;
  active: boolean;
  permissions: GroupPermission[];
  roles: Role[];
};

type GroupQueryData = {
  group: Group;
};

type GroupQueryVariables = {
  id: number;
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
        isAdmin
        active
      }
    }
  }
`;

export default function ViewGroupPage() {
  const router = useRouter();
  const params = useParams();

  const groupId = Number(params.id);

  const {
    data,
    loading,
    error,
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

  const group = data?.group ?? null;

  if (
    !groupId ||
    Number.isNaN(groupId)
  ) {
    return (
      <DashboardLayout>
        <div className="company-groups-view-page">

          <div className="company-page-header">
            <div>
              <div className="company-page-eyebrow">
                ACCESS CONTROL
              </div>

              <h1>
                View group
              </h1>

              <p>
                Review group configuration and
                assigned permissions.
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
            Invalid group ID.
          </div>

        </div>
      </DashboardLayout>
    );
  }

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

  if (error || !group) {
    return (
      <DashboardLayout>
        <div className="company-groups-view-page">

          <div className="company-page-header">
            <div>
              <div className="company-page-eyebrow">
                ACCESS CONTROL
              </div>

              <h1>
                View group
              </h1>

              <p>
                Review group configuration and
                assigned permissions.
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
            {error?.message ||
              "Group not found."}
          </div>

        </div>
      </DashboardLayout>
    );
  }

  const parentPermissions =
    group.permissions || [];

  const roles =
    group.roles || [];

  return (
    <DashboardLayout>
      <div className="company-groups-view-page">

        {/* HEADER */}

        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              ACCESS CONTROL
            </div>

            <h1>
              View group
            </h1>

            <p>
              Review {group.name}'s permissions,
              roles, and current status.
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

            <button
              type="button"
              className="company-primary-button"
              onClick={() =>
                router.push(
                  `/groups/${group.id}/edit`,
                )
              }
            >
              ✎ Edit group
            </button>

          </div>
        </div>

        {/* GROUP SUMMARY */}

        <div className="company-user-stats">

          <div className="company-user-stat-card">

            <div className="company-user-stat-icon company-user-stat-icon-blue">
              ▣
            </div>

            <div className="company-user-stat-content">
              <span>
                Group
              </span>

              <strong>
                {group.name}
              </strong>

              <small>
                ID #{group.id}
              </small>
            </div>

          </div>

          <div className="company-user-stat-card">

            <div
              className={`company-user-stat-icon ${
                group.active
                  ? "company-user-stat-icon-green"
                  : "company-user-stat-icon-red"
              }`}
            >
              {group.active
                ? "✓"
                : "!"}
            </div>

            <div className="company-user-stat-content">

              <span>
                Status
              </span>

              <strong>
                {group.active
                  ? "Active"
                  : "Inactive"}
              </strong>

              <small>
                {group.active
                  ? "Available for role assignment"
                  : "Currently unavailable for Role assignment"}
              </small>

            </div>

          </div>

          <div className="company-user-stat-card">

            <div className="company-user-stat-icon company-user-stat-icon-gold">
              ◆
            </div>

            <div className="company-user-stat-content">

              <span>
                Roles
              </span>

              <strong>
                {roles.length}
              </strong>

              <small>
                {roles.length === 1
                  ? "Role assigned to this group"
                  : "Roles assigned to this group"}
              </small>

            </div>

          </div>

        </div>

        {/* GROUP INFORMATION */}

        <section className="company-groups-view-panel">

          <div className="company-groups-view-panel-header">

            <div className="company-groups-view-heading-icon">
              ▣
            </div>

            <div>

              <div className="company-panel-eyebrow">
                GROUP CONFIGURATION
              </div>

              <h2>
                Group information
              </h2>

              <p>
                Details about this access-control
                group.
              </p>

            </div>

          </div>

          <div className="company-groups-view-information">

            <div className="company-groups-view-information-item">

              <span>
                Group name
              </span>

              <strong>
                {group.name}
              </strong>

            </div>

            <div className="company-groups-view-information-item">

              <span>
                Group ID
              </span>

              <strong>
                #{group.id}
              </strong>

            </div>

            <div className="company-groups-view-information-item">

              <span>
                Status
              </span>

              {group.active ? (
                <span className="company-status-badge company-status-active">
                  <span className="company-status-dot" />
                  <span>
                    Active
                  </span>
                </span>
              ) : (
                <span className="company-status-badge company-status-inactive">
                  <span className="company-status-dot" />
                  <span>
                    Inactive
                  </span>
                </span>
              )}

            </div>

          </div>

        </section>

        {/* PERMISSIONS */}

        <section className="company-groups-view-panel">

          <div className="company-groups-view-panel-header">

            <div className="company-groups-view-heading-icon company-groups-view-heading-icon-green">
              ✓
            </div>

            <div>

              <div className="company-panel-eyebrow">
                ACCESS CONTROL
              </div>

              <h2>
                Parent permissions
              </h2>

              <p>
                Application areas available
                through this group.
              </p>

            </div>

          </div>

          <div className="company-groups-view-content">

            {parentPermissions.length === 0 ? (
              <div className="company-groups-view-empty">

                <div className="company-groups-view-empty-icon">
                  —
                </div>

                <strong>
                  No permissions assigned
                </strong>

                <span>
                  This group currently has no
                  parent permissions.
                </span>

              </div>
            ) : (
              <div className="company-groups-view-permissions">

                {parentPermissions.map(
                  ({
                    permission,
                  }) => {
                    const label =
                      permission.name
                        .split(".")[0]
                        .replace(
                          /^./,
                          (char) =>
                            char.toUpperCase(),
                        );

                    return (
                      <div
                        key={permission.id}
                        className="company-groups-view-permission"
                      >

                        <span className="company-groups-view-permission-check">
                          ✓
                        </span>

                        <div>

                          <strong>
                            {label}
                          </strong>

                          <small>
                            {permission.name}
                          </small>

                        </div>

                      </div>
                    );
                  },
                )}

              </div>
            )}

          </div>

        </section>

        {/* ROLES */}

        <section className="company-groups-view-panel">

          <div className="company-groups-view-panel-header">

            <div className="company-groups-view-heading-icon company-groups-view-heading-icon-gold">
              ◆
            </div>

            <div>

              <div className="company-panel-eyebrow">
                ROLE ASSIGNMENTS
              </div>

              <h2>
                Roles
              </h2>

              <p>
                Roles currently associated with
                this group.
              </p>

            </div>

          </div>

          <div className="company-groups-view-content">

            {roles.length === 0 ? (
              <div className="company-groups-view-empty">

                <div className="company-groups-view-empty-icon">
                  —
                </div>

                <strong>
                  No roles assigned
                </strong>

                <span>
                  No roles currently use this
                  group.
                </span>

              </div>
            ) : (
              <div className="company-groups-view-roles">

                {roles.map(
                  (role) => (
                    <div
                      key={role.id}
                      className="company-groups-view-role"
                    >

                      <div className="company-groups-view-role-icon">
                        ◆
                      </div>

                      <div className="company-groups-view-role-details">

                        <strong>
                          {role.name}
                        </strong>

                        <small>
                          Role ID #{role.id}
                        </small>

                      </div>

                      <div className="company-groups-view-role-meta">

                        {role.isAdmin ? (
                          <span className="company-role-badge company-role-badge-blue">
                            Admin
                          </span>
                        ) : (
                          <span className="company-role-badge company-role-badge-blue">
                            Role
                          </span>
                        )}

                        {role.active ? (
                          <span className="company-status-badge company-status-active">
                            <span className="company-status-dot" />
                            <span>
                              Active
                            </span>
                          </span>
                        ) : (
                          <span className="company-status-badge company-status-inactive">
                            <span className="company-status-dot" />
                            <span>
                              Inactive
                            </span>
                          </span>
                        )}

                      </div>

                    </div>
                  ),
                )}

              </div>
            )}

          </div>

        </section>

        {/* FOOTER */}

        <div className="company-groups-view-footer">

          <button
            type="button"
            className="company-secondary-button"
            onClick={() =>
              router.push("/groups")
            }
          >
            ← Back to groups
          </button>

          <button
            type="button"
            className="company-primary-button"
            onClick={() =>
              router.push(
                `/groups/${group.id}/edit`,
              )
            }
          >
            ✎ Edit group
          </button>

        </div>

      </div>
    </DashboardLayout>
  );
}