"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { gql } from "@apollo/client";

import {
  useMutation,
  useQuery,
} from "@apollo/client/react";

import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import ConfirmModal from "@/components/ConfirmModal";
import NoticeModal from "@/components/NoticeModal";

// -----------------------------------
// GRAPHQL
// -----------------------------------

const ROLES_QUERY = gql`
  query Roles(
    $page: Int
    $limit: Int
    $search: String
  ) {
    roles(
      page: $page
      limit: $limit
      search: $search
    ) {
      data {
        id
        name
        isAdmin
        active
        groupId
        reportsToRoleId

        group {
          id
          name
          active
        }

        reportsToRole {
          id
          name
        }

        users {
          id
          name
        }

        permissions {
          permission {
            id
            name
          }
        }
      }

      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

const TOGGLE_ROLE_STATUS_MUTATION = gql`
  mutation ToggleRoleStatus($id: Int!) {
    toggleRoleStatus(id: $id) {
      id
      name
      active
      isAdmin
    }
  }
`;

const DELETE_ROLE_MUTATION = gql`
  mutation DeleteRole($id: Int!) {
    deleteRole(id: $id)
  }
`;

// -----------------------------------
// TYPES
// -----------------------------------

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

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type RolesQueryData = {
  roles: {
    data: Role[];
    pagination: Pagination;
  };
};

type RolesQueryVariables = {
  page?: number;
  limit?: number;
  search?: string;
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

// -----------------------------------
// PAGE
// -----------------------------------

export default function RolesPage() {
  const router = useRouter();

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

  /*
   * Used to debounce server-side search.
   */
  const searchTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  // -----------------------------------
  // AUTH / INITIAL DATA
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
  }, [router]);

  // -----------------------------------
  // ROLES QUERY
  // -----------------------------------

  const {
    data,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery<
    RolesQueryData,
    RolesQueryVariables
  >(ROLES_QUERY, {
    variables: {
      page: 1,
      limit: 10,
      search: "",
    },
    fetchPolicy: "network-only",
  });

  // -----------------------------------
  // TOGGLE STATUS
  // -----------------------------------

  const [
    toggleRoleStatusMutation,
  ] = useMutation(
    TOGGLE_ROLE_STATUS_MUTATION,
  );

  // -----------------------------------
  // DELETE
  // -----------------------------------

  const [
    deleteRoleMutation,
  ] = useMutation(
    DELETE_ROLE_MUTATION,
  );

  // -----------------------------------
  // SYNC QUERY STATE
  // -----------------------------------

  useEffect(() => {
    if (!data?.roles) {
      return;
    }

    setPagination(
      data.roles.pagination,
    );
  }, [data]);

  useEffect(() => {
    if (queryLoading) {
      return;
    }

    setLoading(false);
  }, [queryLoading]);

  useEffect(() => {
    if (!queryError) {
      return;
    }

    setError(
      queryError.message ||
        "Unable to load roles.",
    );

    setLoading(false);
    setPageLoading(false);
  }, [queryError]);

  // -----------------------------------
  // CLEAN UP SEARCH TIMER
  // -----------------------------------

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

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
  // ROLES
  // -----------------------------------

  const roles =
    data?.roles?.data || [];

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
  // SEARCH
  // -----------------------------------

  function handleSearch(
    value: string,
  ) {
    setSearch(value);

    if (searchTimer.current) {
      clearTimeout(
        searchTimer.current,
      );
    }

    searchTimer.current =
      setTimeout(async () => {
        try {
          setPageLoading(true);
          setError("");

          const result =
            await refetch({
              page: 1,
              limit: 10,
              search: value.trim(),
            });

          if (result.data?.roles) {
  setPagination(
    result.data.roles.pagination,
  );
}
        } catch (err: any) {
          setError(
            err?.message ||
              "Unable to load roles.",
          );
        } finally {
          setPageLoading(false);
        }
      }, 300);

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

    try {
      setPageLoading(true);
      setError("");

      const result =
        await refetch({
          page: nextPage,
          limit: 10,
          search: search.trim(),
        });

      if (result.data?.roles) {
  setPagination(
    result.data.roles.pagination,
  );
}
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load roles.",
      );
    } finally {
      setPageLoading(false);
    }
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

      await toggleRoleStatusMutation({
        variables: {
          id: role.id,
        },
      });

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
      setError(
        err?.message ||
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

      await deleteRoleMutation({
        variables: {
          id: deleteTarget.id,
        },
      });

      const deletedRoleId =
        deleteTarget.id;

      setDeleteTarget(null);

      setStatusOverrides((current) => {
        const next = {
          ...current,
        };

        delete next[deletedRoleId];

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

      setPageLoading(true);

      const result =
        await refetch({
          page: nextPage,
          limit: 10,
          search: search.trim(),
        });

      if (result.data?.roles) {
  setPagination(
    result.data.roles.pagination,
  );
}
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to delete role.",
      );
    } finally {
      setDeleteLoading(false);
      setPageLoading(false);
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

  /*
   * Server-side search already returns the
   * correct current page.
   */
  const filteredRoles = roles;

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
                                  {role.isAdmin ? "Administrator" : "Role"}
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