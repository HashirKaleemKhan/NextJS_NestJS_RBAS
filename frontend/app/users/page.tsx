"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import ConfirmModal from "@/components/ConfirmModal";

type Group = {
  id: number;
  name: string;
  active: boolean;
};

type Role = {
  id: number;
  name: string;
  level: number;
  isAdmin: boolean;
  active: boolean;
  groupId: number | null;
  group?: Group | null;
};

type User = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;

  role?: {
    id?: number;
    name: string;
    level?: number;
    active: boolean;
  };

  manager?: {
    id: number;
    name: string;
  } | null;
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  isAdmin?: boolean;
  permissions?: string[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
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

  const [deleteTarget, setDeleteTarget] =
    useState<User | null>(null);

  const [deleteLoading, setDeleteLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [sessionSuccess, setSessionSuccess] =
    useState("");

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

  /*
   * Prevent the search effect from running
   * during the initial page load.
   */
  const initialUsersLoaded =
    useRef(false);

  const success =
    searchParams.get("success");

  // -----------------------------------
  // LOAD USERS
  // -----------------------------------

  async function loadUsers(
    page: number,
    searchQuery = search,
  ) {
    const usersResponse =
      await api.get("/users", {
        params: {
          page,
          limit: 10,
          search:
            searchQuery.trim(),
        },
      });

    const response =
      usersResponse.data;

    const userList =
      Array.isArray(response)
        ? response
        : Array.isArray(
              response?.data,
            )
          ? response.data
          : [];

    setUsers(userList);

    setPagination({
      page:
        response?.page ??
        page,

      limit:
        response?.limit ??
        10,

      total:
        response?.total ??
        userList.length,

      totalPages:
        response?.totalPages ??
        Math.ceil(
          (response?.total ??
            userList.length) /
            (response?.limit ??
              10),
        ),
    });
  }

  // -----------------------------------
  // INITIAL LOAD
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

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        await loadUsers(1, "");

        /*
         * Mark initial user loading as complete.
         * The search effect will now respond to
         * future search input changes.
         */
        initialUsersLoaded.current =
          true;

        try {
          const rolesResponse =
            await api.get("/roles", {
              params: {
                page: 1,
                limit: 100,
              },
            });

          const rolesData =
            rolesResponse.data;

          const roleList =
            Array.isArray(rolesData)
              ? rolesData
              : Array.isArray(
                    rolesData?.data,
                  )
                ? rolesData.data
                : [];

          setRoles(roleList);
        } catch {
          setRoles([]);
        }

        try {
          const groupsResponse =
            await api.get<{
              data: Group[];
              pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
              };
            }>("/groups", {
              params: {
                page: 1,
                limit: 100,
              },
            });

          setGroups(
            groupsResponse.data.data,
          );
        } catch {
          setGroups([]);
        }
      } catch (err: any) {
        if (
          err?.response?.status ===
          401
        ) {
          router.replace("/login");
          return;
        }

        setError(
          err?.response?.data
            ?.message ||
            "Unable to load users.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // -----------------------------------
  // SERVER-SIDE SEARCH
  // -----------------------------------

  useEffect(() => {
    if (!initialUsersLoaded.current) {
      return;
    }

    const timer =
      setTimeout(() => {
        async function searchUsers() {
          try {
            setPageLoading(true);
            setError("");

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });

            await loadUsers(
              1,
              search,
            );
          } catch (err: any) {
            if (
              err?.response?.status ===
              401
            ) {
              router.replace(
                "/login",
              );
              return;
            }

            setError(
              err?.response?.data
                ?.message ||
                "Unable to search users.",
            );
          } finally {
            setPageLoading(false);
          }
        }

        searchUsers();
      }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [search, router]);

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

    try {
      setPageLoading(true);
      setError("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      await loadUsers(
        nextPage,
        search,
      );
    } catch (err: any) {
      if (
        err?.response?.status ===
        401
      ) {
        router.replace("/login");
        return;
      }

      setError(
        err?.response?.data
          ?.message ||
          "Unable to load users.",
      );
    } finally {
      setPageLoading(false);
    }
  }

  // -----------------------------------
  // SESSION SUCCESS MESSAGE
  // -----------------------------------

  useEffect(() => {
    const message =
      sessionStorage.getItem(
        "usersSuccessMessage",
      );

    if (!message) {
      return;
    }

    sessionStorage.removeItem(
      "usersSuccessMessage",
    );

    setSessionSuccess(message);

    const timer = setTimeout(() => {
      setSessionSuccess("");
    }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // -----------------------------------
  // URL SUCCESS MESSAGE
  // -----------------------------------

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace("/users");
    }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [success, router]);

  // -----------------------------------
  // SUCCESS MESSAGE TEXT
  // -----------------------------------

  function getSuccessMessage() {
    switch (success) {
      case "created":
        return "User created successfully.";

      case "updated":
        return "User updated successfully.";

      case "deleted":
        return "User deleted successfully.";

      case "activated":
        return "User activated successfully.";

      case "deactivated":
        return "User deactivated successfully.";

      default:
        return "";
    }
  }

  // -----------------------------------
  // PERMISSIONS
  // -----------------------------------

  const userPermissions =
    currentUser?.permissions || [];

  const canCreateUsers =
    userPermissions.includes(
      "users.create",
    );

  const canUpdateUsers =
    userPermissions.includes(
      "users.update",
    );

  const canDeleteUsers =
    userPermissions.includes(
      "users.delete",
    );

  // -----------------------------------
  // GET ROLE
  // -----------------------------------

  function getRole(user: User) {
    if (!user.role) {
      return undefined;
    }

    if (
      user.role.id !== undefined
    ) {
      return roles.find(
        (role) =>
          role.id ===
          user.role?.id,
      );
    }

    return roles.find(
      (role) =>
        role.name ===
        user.role?.name,
    );
  }

  // -----------------------------------
  // GET GROUP
  // -----------------------------------

  function getGroupName(
    user: User,
  ) {
    const role =
      getRole(user);

    if (role?.isAdmin) {
      return "System Administration";
    }

    if (!role?.groupId) {
      return "Unassigned";
    }

    return (
      groups.find(
        (group) =>
          group.id ===
          role.groupId,
      )?.name ||
      "Unassigned"
    );
  }

  // -----------------------------------
  // GET REPORTS TO
  // -----------------------------------

  function getReportsTo(
    user: User,
  ) {
    if (user.manager) {
      return user.manager.name;
    }

    return "Unassigned";
  }

  // -----------------------------------
  // SEARCH DISPLAY
  // -----------------------------------

  /*
   * Search is now performed by the backend.
   * Therefore users already contains only
   * the records matching the current search.
   */
  const filteredUsers = users;

  // -----------------------------------
  // SEARCH INPUT
  // -----------------------------------

  function handleSearch(
    value: string,
  ) {
    setSearch(value);
  }

  // -----------------------------------
  // TOGGLE USER STATUS
  // -----------------------------------

  async function toggleUserStatus(
    user: User,
  ) {
    const role =
      getRole(user);

    const isProtectedAdmin =
      currentUser?.role ===
        "Admin" &&
      role?.isAdmin === true;

    if (isProtectedAdmin) {
      setError(
        "Administrators cannot manage other administrators.",
      );
      return;
    }

    if (
      user.id ===
      currentUser?.id
    ) {
      setError(
        "You cannot change your own account status.",
      );
      return;
    }

    try {
      setError("");

      const newActiveStatus =
        !user.active;

      await api.patch(
        `/users/${user.id}/status`,
        {
          active:
            newActiveStatus,
        },
      );

      setUsers(
        (currentUsers) =>
          currentUsers.map(
            (item) =>
              item.id === user.id
                ? {
                    ...item,
                    active:
                      newActiveStatus,
                  }
                : item,
          ),
      );

      router.replace(
        `/users?success=${
          newActiveStatus
            ? "activated"
            : "deactivated"
        }`,
      );
    } catch (err: any) {
      setError(
        err?.response?.data
          ?.message ||
          "Unable to update user status.",
      );
    }
  }

  // -----------------------------------
  // DELETE USER
  // -----------------------------------

  function deleteUser(user: User) {
    if (
      user.id ===
      currentUser?.id
    ) {
      setError(
        "You cannot delete yourself.",
      );
      return;
    }

    const role =
      getRole(user);

    const isProtectedAdmin =
      currentUser?.role ===
        "Admin" &&
      role?.isAdmin === true;

    if (isProtectedAdmin) {
      setError(
        "You cannot delete another Admin.",
      );
      return;
    }

    setError("");
    setDeleteTarget(user);
  }

  // -----------------------------------
  // CONFIRM DELETE USER
  // -----------------------------------

  async function confirmDeleteUser() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      await api.delete(
        `/users/${deleteTarget.id}`,
      );

      setUsers(
        (currentUsers) =>
          currentUsers.filter(
            (currentUser) =>
              currentUser.id !==
              deleteTarget.id,
          ),
      );

      setDeleteTarget(null);

      router.replace(
        "/users?success=deleted",
      );
    } catch (err: any) {
      setError(
        err?.response?.data
          ?.message ||
          "Unable to delete user.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  // -----------------------------------
  // COUNTS
  // -----------------------------------

  const totalUsers =
    pagination.total;

  const activeUsers =
    users.filter(
      (user) => user.active,
    ).length;

  const inactiveUsers =
    users.filter(
      (user) => !user.active,
    ).length;

  // -----------------------------------
  // PAGINATION
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
  // INITIAL LOADING
  // -----------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="company-page-loading">
          <div className="company-loading-spinner" />

          <span>
            Loading users...
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
      <div className="company-users-page">

        {/* PAGE HEADER */}

        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              USER MANAGEMENT
            </div>

            <h1>
              Users
            </h1>

            <p>
              Manage all users in your system.
            </p>
          </div>

          <div className="company-page-actions">
            {canCreateUsers && (
              <button
                type="button"
                className="company-primary-button"
                onClick={() =>
                  router.push(
                    "/users/create",
                  )
                }
              >
                <span className="company-button-plus">
                  +
                </span>

                Add User
              </button>
            )}
          </div>
        </div>

        {/* SUCCESS */}

        {sessionSuccess ? (
          <div className="company-users-success">
            ✓ {sessionSuccess}
          </div>
        ) : success &&
          getSuccessMessage() ? (
          <div className="company-users-success">
            ✓ {getSuccessMessage()}
          </div>
        ) : null}

        {/* ERROR */}

        {error && (
          <div className="company-users-error">
            {error}
          </div>
        )}

        {/* USER STATISTICS */}

        <div className="company-user-stats">

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-blue">
              ◉
            </div>

            <div className="company-user-stat-content">
              <span>
                Total Users
              </span>

              <strong>
                {totalUsers}
              </strong>

              <small>
                Users configured in the system
              </small>
            </div>
          </div>

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-green">
              ✓
            </div>

            <div className="company-user-stat-content">
              <span>
                Active users
              </span>

              <strong>
                {activeUsers}
              </strong>

              <small>
                Active users on this page
              </small>
            </div>
          </div>

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-gold">
              ○
            </div>

            <div className="company-user-stat-content">
              <span>
                Inactive users
              </span>

              <strong>
                {inactiveUsers}
              </strong>

              <small>
                Inactive users on this page
              </small>
            </div>
          </div>

        </div>

        {/* USERS PANEL */}

        <div className="company-users-panel">

          {/* PANEL HEADER */}

          <div className="company-users-panel-header">
            <div>
              <div className="company-panel-eyebrow">
                CONFIGURATION
              </div>

              <h2>
                All users
              </h2>

              <p>
                {pagination.total}{" "}
                {pagination.total === 1
                  ? "user"
                  : "users"}{" "}
                found
              </p>
            </div>

            <div className="company-users-search">
              <span className="company-users-search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search users..."
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

          {pageLoading && (
            <div className="company-users-page-loading-overlay">
              <div className="company-loading-spinner" />
            </div>
          )}

          {/* EMPTY */}

          {filteredUsers.length ===
          0 ? (
            <div className="company-users-empty">
              <div className="company-users-empty-icon">
                ◉
              </div>

              <h3>
                No users found
              </h3>

              <p>
                {search
                  ? "Try changing your search."
                  : "No users found."}
              </p>
            </div>
          ) : (

            /* TABLE */

            <div className="company-users-table-wrapper">
              <table className="company-users-table">

                <thead>
                  <tr>
                    <th>
                      USER
                    </th>

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
                      STATUS
                    </th>

                    {(canUpdateUsers ||
                      canDeleteUsers) && (
                      <th className="company-actions-heading">
                        ACTIONS
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map(
                    (user) => {
                      const role =
                        getRole(user);

                      const groupName =
                        getGroupName(
                          user,
                        );

                      const isCurrentUser =
                        user.id ===
                        currentUser?.id;

                      const isProtectedAdmin =
                        currentUser?.role ===
                          "Admin" &&
                        role?.isAdmin ===
                          true;

                      return (
                        <tr
                          key={
                            user.id
                          }
                        >

                          {/* USER */}

                          <td>
                            <div className="company-user-cell">
                              <div className="company-user-avatar">
                                {user.name
                                  ?.charAt(
                                    0,
                                  )
                                  .toUpperCase() ||
                                  "U"}
                              </div>

                              <div className="company-user-details">
                                <div className="company-user-name">
                                  {
                                    user.name
                                  }
                                </div>

                                <div className="company-user-email">
                                  {
                                    user.email
                                  }
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* ROLE */}

                          <td>
                            <span className="company-role-badge company-role-badge-blue">
                              {role?.name ||
                                user
                                  .role
                                  ?.name ||
                                "Unassigned"}
                            </span>
                          </td>

                          {/* GROUP */}

                          <td>
                            {role?.isAdmin ? (
                              <div className="company-admin-group-cell">
                                <span className="company-admin-group-badge">
                                  System Admin
                                </span>
                              </div>
                            ) : (
                              <span>
                                {
                                  groupName
                                }
                              </span>
                            )}
                          </td>

                          {/* REPORTS TO */}

                          <td>
                            {user.manager ? (
                              <div className="company-reports-to-cell">
                                <div className="company-reports-to-name">
                                  {
                                    user
                                      .manager
                                      .name
                                  }
                                </div>
                              </div>
                            ) : (
                              <span className="company-reports-to-unassigned">
                                Unassigned
                              </span>
                            )}
                          </td>

                          {/* STATUS */}

                          <td>
                            {user.active ? (
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
                          </td>

                          {/* ACTIONS */}

                          {(canUpdateUsers ||
                            canDeleteUsers) && (
                            <td>
                              <div className="company-user-actions">

                                {/* VIEW */}

                                <button
                                  type="button"
                                  className="company-icon-button company-icon-view"
                                  onClick={() =>
                                    router.push(
                                      `/users/${user.id}`,
                                    )
                                  }
                                  title="View"
                                  aria-label={`View ${user.name}`}
                                >
                                  ◉
                                </button>

                                {/* EDIT */}

                                {canUpdateUsers &&
                                  !isProtectedAdmin && (
                                    <button
                                      type="button"
                                      className="company-icon-button company-icon-edit"
                                      onClick={() =>
                                        router.push(
                                          `/users/${user.id}/edit`,
                                        )
                                      }
                                      title="Edit"
                                      aria-label={`Edit ${user.name}`}
                                    >
                                      ✎
                                    </button>
                                  )}

                                {/* STATUS */}

                                {canUpdateUsers &&
                                  !isCurrentUser &&
                                  !isProtectedAdmin && (
                                    <button
                                      type="button"
                                      className={`company-icon-button ${
                                        user.active
                                          ? "company-icon-status"
                                          : "company-icon-status-inactive"
                                      }`}
                                      onClick={() =>
                                        toggleUserStatus(
                                          user,
                                        )
                                      }
                                      title={
                                        user.active
                                          ? "Deactivate"
                                          : "Activate"
                                      }
                                      aria-label={
                                        user.active
                                          ? `Deactivate ${user.name}`
                                          : `Activate ${user.name}`
                                      }
                                    >
                                      {user.active
                                        ? "●"
                                        : "○"}
                                    </button>
                                  )}

                                {/* DELETE */}

                                {canDeleteUsers &&
                                  !isCurrentUser &&
                                  !isProtectedAdmin && (
                                    <button
                                      type="button"
                                      className="company-icon-button company-icon-delete"
                                      onClick={() =>
                                        deleteUser(
                                          user,
                                        )
                                      }
                                      title="Delete"
                                      aria-label={`Delete ${user.name}`}
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

          {/* FOOTER / PAGINATION */}

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
                    pagination.page <= 1 ||
                    pageLoading
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
                    pagination.page >=
                      pagination.totalPages ||
                    pageLoading
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

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User?"
        description={
          <>
            Are you sure you want to delete{" "}
            <strong>
              {deleteTarget?.name}
            </strong>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Delete User"
        onConfirm={
          confirmDeleteUser
        }
        onCancel={() =>
          setDeleteTarget(null)
        }
        loading={
          deleteLoading
        }
      />

    </DashboardLayout>
  );
}