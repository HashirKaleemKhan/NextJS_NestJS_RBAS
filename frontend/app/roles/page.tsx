"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import ConfirmModal from "@/components/ConfirmModal";
import NoticeModal from "@/components/NoticeModal";

type Group = {
  id: number;
  name: string;
  active: boolean;
};

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

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type RolesResponse = {
  data: Role[];
  pagination: Pagination;
};

export default function RolesPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [pageLoading, setPageLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<Role | null>(null);

  const [noticeOpen, setNoticeOpen] =
    useState(false);

  const [deleteLoading, setDeleteLoading] =
    useState(false);

  const [statusLoadingId, setStatusLoadingId] =
    useState<number | null>(null);

  /*
   * Status changes are stored separately from
   * the original role objects.
   */
  const [statusOverrides, setStatusOverrides] =
    useState<Record<number, boolean>>({});

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

  // -----------------------------------
  // SUCCESS MESSAGE
  // -----------------------------------

  useEffect(() => {
    if (!success) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    const timer = window.setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success]);

  // -----------------------------------
  // LOAD ROLES
  // -----------------------------------

  async function loadRoles(
    page: number,
    showInitialLoading = false,
  ) {
    try {
      if (showInitialLoading) {
        setLoading(true);
      } else {
        setPageLoading(true);
      }

      setError("");

      const response =
        await api.get<RolesResponse>(
          "/roles",
          {
            params: {
              page,
              limit: 10,
            },
          },
        );

      const roleList = Array.isArray(
        response.data?.data,
      )
        ? response.data.data
        : [];

      setRoles(roleList);

      setPagination(
        response.data.pagination,
      );
    } catch (err: any) {
      if (
        err?.response?.status === 401
      ) {
        router.replace("/login");
        return;
      }

      setError(
        err?.response?.data?.message ||
          "Unable to load roles.",
      );
    } finally {
      if (showInitialLoading) {
        setLoading(false);
      } else {
        setPageLoading(false);
      }
    }
  }

  // -----------------------------------
  // LOAD DATA
  // -----------------------------------

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const user =
      getUser() as CurrentUser | null;

    setCurrentUser(user);

    const successMessage =
      sessionStorage.getItem(
        "rolesSuccessMessage",
      );

    if (successMessage) {
      setSuccess(successMessage);

      sessionStorage.removeItem(
        "rolesSuccessMessage",
      );
    }

    async function loadGroups() {
      try {
        const groupsResponse =
          await api.get<Group[]>(
            "/roles/groups",
          );

        setGroups(
          Array.isArray(
            groupsResponse.data,
          )
            ? groupsResponse.data
            : [],
        );
      } catch {
        setGroups([]);
      }
    }

    async function loadInitialData() {
      await Promise.all([
        loadRoles(1, true),
        loadGroups(),
      ]);
    }

    loadInitialData();
  }, [router]);

  // -----------------------------------
  // PERMISSIONS
  // -----------------------------------

  const userPermissions =
    currentUser?.permissions || [];

  const canCreateRoles =
    userPermissions.includes(
      "roles.manage",
    );

  const canUpdateRoles =
    userPermissions.includes(
      "roles.manage",
    );

  const canDeleteRoles =
    userPermissions.includes(
      "roles.manage",
    );

  // -----------------------------------
  // ROLE STATUS
  // -----------------------------------

  function isRoleActive(role: Role) {
    return (
      statusOverrides[role.id] ??
      role.active
    );
  }

  // -----------------------------------
  // GROUP
  // -----------------------------------

  function getGroupName(role: Role) {
    if (role.isAdmin) {
      return "System Administration";
    }

    if (role.group) {
      return role.group.name;
    }

    if (role.groupId !== null) {
      return (
        groups.find(
          (group) =>
            group.id === role.groupId,
        )?.name || "Unassigned"
      );
    }

    return "Unassigned";
  }

  // -----------------------------------
  // REPORTS TO
  // -----------------------------------

  function getReportsTo(role: Role) {
    if (role.isAdmin) {
      return "Unassigned";
    }

    return (
      role.reportsToRole?.name ||
      "Unassigned"
    );
  }

  // -----------------------------------
  // SEARCH / FILTER
  // -----------------------------------

  const filteredRoles =
    useMemo(() => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return roles;
      }

      return roles.filter((role) => {
        const groupName =
          getGroupName(role);

        const reportsTo =
          getReportsTo(role);

        const permissionNames =
          role.permissions
            ?.map(
              (item) =>
                item.permission.name,
            )
            .join(" ") || "";

        return [
          role.name,
          role.isAdmin
            ? "admin administrator"
            : "role",
          groupName,
          reportsTo,
          isRoleActive(role)
            ? "active"
            : "inactive",
          permissionNames,
        ]
          .filter(Boolean)
          .some((value) =>
            value
              .toLowerCase()
              .includes(query),
          );
      });
    }, [
      roles,
      groups,
      search,
      statusOverrides,
    ]);

  // -----------------------------------
  // SEARCH
  // -----------------------------------

  function handleSearch(
    value: string,
  ) {
    setSearch(value);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // -----------------------------------
  // CHANGE PAGE
  // -----------------------------------

  async function changePage(
    nextPage: number,
  ) {
    if (
      nextPage < 1 ||
      nextPage >
        pagination.totalPages
    ) {
      return;
    }

    if (
      nextPage ===
      pagination.page
    ) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    await loadRoles(nextPage);
  }

  // -----------------------------------
  // PAGINATION RANGE
  // -----------------------------------

  const showingFrom =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) *
          pagination.limit +
        1;

  const showingTo =
    Math.min(
      pagination.page *
        pagination.limit,
      pagination.total,
    );

  // -----------------------------------
  // STATUS
  // -----------------------------------

  async function toggleRoleStatus(
    role: Role,
  ) {
    if (
      role.isAdmin ||
      statusLoadingId !== null
    ) {
      return;
    }

    const currentStatus =
      isRoleActive(role);

    try {
      setError("");
      setStatusLoadingId(role.id);

      await api.patch(
        `/roles/${role.id}/status`,
      );

      setStatusOverrides((current) => ({
        ...current,
        [role.id]: !currentStatus,
      }));

      setSuccess(
        currentStatus
          ? "Role deactivated successfully."
          : "Role activated successfully.",
      );
    } catch (err: any) {
      if (
        err?.response?.status === 401
      ) {
        router.replace("/login");
        return;
      }

      setError(
        err?.response?.data?.message ||
          "Unable to update role status.",
      );
    } finally {
      setStatusLoadingId(null);
    }
  }

  // -----------------------------------
  // DELETE
  // -----------------------------------

  function deleteRole(
    role: Role,
  ) {
    if (role.isAdmin) {
      setNoticeOpen(true);
      return;
    }

    setError("");
    setDeleteTarget(role);
  }

  // -----------------------------------
  // CONFIRM DELETE ROLE
  // -----------------------------------

  async function confirmDeleteRole() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      await api.delete(
        `/roles/${deleteTarget.id}`,
      );

      setDeleteTarget(null);

      setStatusOverrides((current) => {
        const next = {
          ...current,
        };

        delete next[deleteTarget.id];

        return next;
      });

      setSuccess(
        "Role deleted successfully.",
      );

      const currentPage =
        pagination.page;

      const currentTotal =
        pagination.total;

      const newTotal =
        Math.max(
          0,
          currentTotal - 1,
        );

      const newTotalPages =
        Math.ceil(
          newTotal /
            pagination.limit,
        );

      const nextPage =
        newTotalPages === 0
          ? 1
          : Math.min(
              currentPage,
              newTotalPages,
            );

      await loadRoles(nextPage);
    } catch (err: any) {
      if (
        err?.response?.status === 401
      ) {
        router.replace("/login");
        return;
      }

      setError(
        err?.response?.data?.message ||
          "Unable to delete role.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  // -----------------------------------
  // COUNTS
  // -----------------------------------

  const totalRoles =
    pagination.total;

  const activeRoles =
    roles.filter(
      (role) => isRoleActive(role),
    ).length;

  const inactiveRoles =
    roles.filter(
      (role) => !isRoleActive(role),
    ).length;

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="company-page-loading">
          <div className="company-loading-spinner" />

          <span>
            Loading roles...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <DashboardLayout>
      <div className="company-roles-page">

        {/* PAGE HEADER */}

        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              ACCESS MANAGEMENT
            </div>

            <h1>
              Roles
            </h1>

            <p>
              Manage system roles, reporting
              relationships, and permissions.
            </p>
          </div>

          <div className="company-page-actions">
            {canCreateRoles && (
              <button
                type="button"
                className="company-primary-button"
                onClick={() =>
                  router.push(
                    "/roles/create",
                  )
                }
              >
                <span className="company-button-plus">
                  +
                </span>

                Add Role
              </button>
            )}
          </div>
        </div>

        {/* MESSAGES */}

        {success && (
          <div className="company-users-success">
            <span className="company-users-success-icon">
              ✓
            </span>

            <span>
              {success}
            </span>
          </div>
        )}

        {error && (
          <div className="company-users-error">
            {error}
          </div>
        )}

        {/* ROLE STATISTICS */}

        <div className="company-user-stats">

          {/* TOTAL */}

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-blue">
              ◉
            </div>

            <div className="company-user-stat-content">
              <span>
                Total roles
              </span>

              <strong>
                {totalRoles}
              </strong>

              <small>
                Roles configured in the system
              </small>
            </div>
          </div>

          {/* ACTIVE */}

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-green">
              ✓
            </div>

            <div className="company-user-stat-content">
              <span>
                Active roles
              </span>

              <strong>
                {activeRoles}
              </strong>

              <small>
                Active roles on this page
              </small>
            </div>
          </div>

          {/* INACTIVE */}

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-gold">
              ○
            </div>

            <div className="company-user-stat-content">
              <span>
                Inactive roles
              </span>

              <strong>
                {inactiveRoles}
              </strong>

              <small>
                Inactive roles on this page
              </small>
            </div>
          </div>

        </div>

        {/* ROLES PANEL */}

        <div className="company-roles-panel">

          <div className="company-users-panel-header">
            <div>
              <div className="company-panel-eyebrow">
                CONFIGURATION
              </div>

              <h2>
                All roles
              </h2>

              <p>
                {pagination.total}{" "}
                {pagination.total === 1
                  ? "role"
                  : "roles"}{" "}
                found
              </p>
            </div>

            <div className="company-users-search">
              <span className="company-users-search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search roles..."
                value={search}
                onChange={(event) =>
                  handleSearch(
                    event.target.value,
                  )
                }
              />

              {search && (
                <button
                  type="button"
                  className="company-users-search-clear"
                  onClick={() =>
                    handleSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* PAGE LOADING */}

          {pageLoading ? (
            <div className="company-page-loading">
              <div className="company-loading-spinner" />

              <span>
                Loading roles...
              </span>
            </div>
          ) : filteredRoles.length ===
            0 ? (

            /* EMPTY */

            <div className="company-users-empty">
              <div className="company-users-empty-icon">
                ◆
              </div>

              <h3>
                No roles found
              </h3>

              <p>
                {search
                  ? "Try changing your search."
                  : "No roles found."}
              </p>

              {!search &&
                canCreateRoles && (
                  <button
                    type="button"
                    className="company-empty-clear"
                    onClick={() =>
                      router.push(
                        "/roles/create",
                      )
                    }
                  >
                    Create your first role
                  </button>
                )}
            </div>
          ) : (
            <div className="company-roles-table-wrapper">
              <table className="company-roles-table">

                <thead>
                  <tr>
                    <th>
                      ROLE
                    </th>

                    <th>
                      GROUP
                    </th>

                    <th>
                      REPORTS TO
                    </th>

                    <th>
                      USERS
                    </th>

                    <th>
                      PERMISSIONS
                    </th>

                    <th>
                      STATUS
                    </th>

                    {(canUpdateRoles ||
                      canDeleteRoles) && (
                      <th className="company-actions-heading">
                        ACTIONS
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredRoles.map(
                    (role) => {
                      const groupName =
                        getGroupName(
                          role,
                        );

                      const reportsTo =
                        getReportsTo(
                          role,
                        );

                      const permissionCount =
                        role.permissions
                          ?.length || 0;

                      const userCount =
                        role.users
                          ?.length || 0;

                      const isStatusUpdating =
                        statusLoadingId ===
                        role.id;

                      const roleIsActive =
                        isRoleActive(role);

                      return (
                        <tr
                          key={
                            role.id
                          }
                        >

                          {/* ROLE */}

                          <td>
                            <div className="company-role-cell">

                              <div
                                className="company-role-avatar"
                                aria-hidden="true"
                              >
                                <span>
                                  ◆
                                </span>
                              </div>

                              <div className="company-role-details">
                                <div className="company-role-name">
                                  {
                                    role.name
                                  }
                                </div>

                                <div className="company-role-level">
                                  {role.isAdmin
                                    ? "Administrator"
                                    : `Level ${role.level}`}
                                </div>
                              </div>

                            </div>
                          </td>

                          {/* GROUP */}

                          <td>
                            {role.isAdmin ? (
                              <span className="company-admin-group-badge">
                                System Admin
                              </span>
                            ) : (
                              <span className="company-role-group">
                                {
                                  groupName
                                }
                              </span>
                            )}
                          </td>

                          {/* REPORTS TO */}

                          <td>
                            {role.isAdmin ||
                            !role.reportsToRoleId ? (
                              <span className="company-reports-to-unassigned">
                                Unassigned
                              </span>
                            ) : (
                              <div className="company-role-reports">
                                <div className="company-role-reports-name">
                                  {
                                    reportsTo
                                  }
                                </div>
                              </div>
                            )}
                          </td>

                          {/* USERS */}

                          <td>
                            <span className="company-role-user-count">
                              {userCount}
                            </span>
                          </td>

                          {/* PERMISSIONS */}

                          <td>
                            {role.isAdmin ? (
                              <span className="company-role-badge company-role-badge-green">
                                All access
                              </span>
                            ) : (
                              <span className="company-role-badge company-role-badge-blue">
                                {permissionCount}{" "}
                                {permissionCount ===
                                1
                                  ? "permission"
                                  : "permissions"}
                              </span>
                            )}
                          </td>

                          {/* STATUS */}

                          <td>
                            <span
                              className={`company-status-badge ${
                                roleIsActive
                                  ? "company-status-active"
                                  : "company-status-inactive"
                              }`}
                            >
                              <span className="company-status-dot" />

                              <span>
                                {roleIsActive
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </span>
                          </td>

                          {/* ACTIONS */}

                          {(canUpdateRoles ||
                            canDeleteRoles) && (
                            <td>
                              <div className="company-role-actions">

                                {/* VIEW */}

                                <button
                                  type="button"
                                  className="company-icon-button company-icon-view"
                                  onClick={() =>
                                    router.push(
                                      `/roles/${role.id}`,
                                    )
                                  }
                                  title="View"
                                  aria-label={`View ${role.name}`}
                                >
                                  ◉
                                </button>

                                {/* EDIT */}

                                {canUpdateRoles && (
                                  <>
                                    <button
                                      type="button"
                                      className="company-icon-button company-icon-edit"
                                      onClick={() =>
                                        router.push(
                                          `/roles/${role.id}/edit`,
                                        )
                                      }
                                      title="Edit"
                                      aria-label={`Edit ${role.name}`}
                                    >
                                      ✎
                                    </button>

                                    {/* STATUS */}

                                    {!role.isAdmin && (
                                      <button
                                        type="button"
                                        className={`company-icon-button ${
                                          roleIsActive
                                            ? "company-icon-status"
                                            : "company-icon-status-inactive"
                                        }`}
                                        onClick={() =>
                                          toggleRoleStatus(
                                            role,
                                          )
                                        }
                                        disabled={
                                          statusLoadingId !==
                                            null &&
                                          !isStatusUpdating
                                        }
                                        title={
                                          roleIsActive
                                            ? "Deactivate"
                                            : "Activate"
                                        }
                                        aria-label={
                                          roleIsActive
                                            ? `Deactivate ${role.name}`
                                            : `Activate ${role.name}`
                                        }
                                      >
                                        {isStatusUpdating
                                          ? "…"
                                          : roleIsActive
                                            ? "●"
                                            : "○"}
                                      </button>
                                    )}
                                  </>
                                )}

                                {/* DELETE */}

                                {canDeleteRoles &&
                                  !role.isAdmin && (
                                    <button
                                      type="button"
                                      className="company-icon-button company-icon-delete"
                                      onClick={() =>
                                        deleteRole(
                                          role,
                                        )
                                      }
                                      title="Delete"
                                      aria-label={`Delete ${role.name}`}
                                    >
                                      ×
                                    </button>
                                  )}

                              </div>
                            </td>
                          )}

                        </tr>
                      );
                    },
                  )}
                </tbody>

              </table>
            </div>
          )}

          {/* PAGINATION */}

          {pagination.total > 0 && (
            <div className="company-logs-pagination">

              <div className="company-logs-pagination-info">
                Showing{" "}
                {showingFrom}{" "}
                –{" "}
                {showingTo}{" "}
                of{" "}
                {pagination.total}
              </div>

              <div className="company-logs-pagination-controls">

                <button
                  type="button"
                  disabled={
                    pageLoading ||
                    pagination.page <=
                      1
                  }
                  onClick={() =>
                    changePage(
                      pagination.page - 1,
                    )
                  }
                >
                  ←
                </button>

                <span>
                  Page{" "}
                  {pagination.page}{" "}
                  of{" "}
                  {pagination.totalPages ||
                    1}
                </span>

                <button
                  type="button"
                  disabled={
                    pageLoading ||
                    pagination.page >=
                      pagination.totalPages
                  }
                  onClick={() =>
                    changePage(
                      pagination.page + 1,
                    )
                  }
                >
                  →
                </button>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* DELETE ROLE CONFIRMATION */}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Role?"
        description={
          <>
            Are you sure you want to delete{" "}
            <strong>
              {deleteTarget?.name}
            </strong>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Delete Role"
        onConfirm={
          confirmDeleteRole
        }
        onCancel={() => {
          if (!deleteLoading) {
            setDeleteTarget(null);
          }
        }}
        loading={
          deleteLoading
        }
      />

      <NoticeModal
        open={noticeOpen}
        title="Administrator Role"
        description={
          <>
            Administrator roles are protected and
            cannot be deleted.
          </>
        }
        buttonLabel="Understood"
        onClose={() =>
          setNoticeOpen(false)
        }
      />

    </DashboardLayout>
  );
}