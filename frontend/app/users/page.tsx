"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { graphqlRequest } from "@/lib/graphql";
import { getUser, logout } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import "../roles/roles.css";

type User = {
  id: number;
  name: string;
  email: string;

  role?: {
    id: number;
    name: string;
    isAdmin: boolean;
    active: boolean;
  };

  manager?: {
    id: number;
    name: string;
    role?: {
      id: number;
      name: string;
      isAdmin: boolean;
      active: boolean;
    };
  } | null;
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

type UsersQueryResponse = {
  users: User[];
};

type DeleteUserResponse = {
  deleteUser: {
    message: string;
  };
};

const USERS_QUERY = `
  query {
    users {
      id
      name
      email

      role {
        id
        name
        isAdmin
        active
      }

      manager {
        id
        name

        role {
          id
          name
          isAdmin
          active
        }
      }
    }
  }
`;

const DELETE_USER_MUTATION = `
  mutation DeleteUser($id: Int!) {
    deleteUser(id: $id) {
      message
    }
  }
`;

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // -----------------------------------
  // LOAD USERS
  // -----------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const user = getUser() as CurrentUser | null;

    setCurrentUser(user);

    async function loadUsers() {
      try {
        const data =
          await graphqlRequest<UsersQueryResponse>(
            USERS_QUERY,
          );

        setUsers(data.users);
      } catch (err: any) {
        const message =
          err?.message || "";

        if (
          message
            .toLowerCase()
            .includes("unauthorized")
        ) {
          router.replace("/login");
          return;
        }

        if (
          message
            .toLowerCase()
            .includes("forbidden")
        ) {
          router.replace("/dashboard");
          return;
        }

        setError("Unable to load users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [router]);

  // -----------------------------------
  // PERMISSIONS
  // -----------------------------------

  const userPermissions =
    currentUser?.permissions || [];

  const canCreateUsers =
    userPermissions.includes("users.create");

  const canUpdateUsers =
    userPermissions.includes("users.update");

  const canDeleteUsers =
    userPermissions.includes("users.delete");

  // -----------------------------------
  // STATISTICS
  // -----------------------------------

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.role?.active === true,
  ).length;

  const inactiveUsers = users.filter(
    (user) => user.role?.active !== true,
  ).length;

  // -----------------------------------
  // DELETE USER
  // -----------------------------------

  async function deleteUser(user: User) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await graphqlRequest<DeleteUserResponse>(
        DELETE_USER_MUTATION,
        { id: user.id },
      );

      setUsers((currentUsers) =>
        currentUsers.filter(
          (currentUser) =>
            currentUser.id !== user.id,
        ),
      );
    } catch (err: any) {
      alert(
        err?.message ||
          "Unable to delete user.",
      );
    }
  }

  // -----------------------------------
  // EDIT USER
  // -----------------------------------

  function editUser(user: User) {
    router.push(`/users/${user.id}/edit`);
  }

  // -----------------------------------
  // SEARCH
  // -----------------------------------

  const filteredUsers = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.role?.name,
        user.manager?.name,
      ]
        .filter(Boolean)
        .some((value) =>
          value!
            .toLowerCase()
            .includes(query),
        ),
    );
  }, [users, search]);

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Loading users...
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            USER MANAGEMENT
          </div>

          <h1>Users</h1>

          <p>
            Manage users and their access
            to the application.
          </p>
        </div>

        <div className="page-header-actions">
          {canCreateUsers && (
            <button
              className="button button-primary"
              onClick={() =>
                router.push("/users/create")
              }
            >
              Create user
            </button>
          )}

          <button
            className="button button-secondary"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          {error}
        </div>
      )}

      {/* -------------------------------- */}
      {/* USER STATISTICS */}
      {/* -------------------------------- */}

      <div className="stats-grid">
        {/* TOTAL */}

        <div className="stat-card stat-card-total">
          <div className="stat-card-content">
            <span className="stat-card-label">
              Total Users
            </span>

            <strong className="stat-card-value">
              {totalUsers}
            </strong>

            <span className="stat-card-description">
              Users in your management scope
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
              {activeUsers}
            </strong>

            <span className="stat-card-description">
              Active Users
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
              {inactiveUsers}
            </strong>

            <span className="stat-card-description">
              Disabled Users
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------- */}
      {/* USERS LIST */}
      {/* -------------------------------- */}

      <div className="content-card users-card">
        <div className="users-toolbar">
          <div>
            <h2>All users</h2>

            <p>
              {users.length}{" "}
              {users.length === 1
                ? "user"
                : "users"}{" "}
              in your management scope
            </p>
          </div>

          <div className="search-wrapper">
            <span className="search-icon">
              ⌕
            </span>

            <input
              className="search-input"
              placeholder="Search users..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>
        </div>

        {/* -------------------------------- */}
        {/* EMPTY STATE */}
        {/* -------------------------------- */}

        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              ◉
            </div>

            <h3>No users found</h3>

            <p>
              {search
                ? "Try changing your search."
                : "There are no users to display."}
            </p>
          </div>
        ) : (
          /* -------------------------------- */
          /* USERS TABLE */
          /* -------------------------------- */

          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>USER</th>

                  <th>EMAIL</th>

                  <th>ROLE</th>

                  <th>REPORTS TO</th>

                  <th>STATUS</th>

                  {(canUpdateUsers ||
                    canDeleteUsers) && (
                    <th>ACTIONS</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    {/* USER */}

                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="user-name">
                            {user.name}
                          </div>

                          <div className="user-id">
                            ID #{user.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* EMAIL */}

                    <td>
                      <span className="email-text">
                        {user.email}
                      </span>
                    </td>

                    {/* ROLE */}

                    <td>
                      <span
                        className={`role-badge role-${user.role?.name?.toLowerCase()}`}
                      >
                        {user.role?.name ||
                          "Developer"}
                      </span>
                    </td>

                    {/* REPORTS TO */}

                    <td>
                      {user.manager ? (
                        <div>
                          <div className="user-name">
                            {
                              user.manager
                                .name
                            }
                          </div>

                          <div className="user-id">
                            ID #
                            {
                              user.manager
                                .id
                            }
                          </div>
                        </div>
                      ) : (
                        <span className="current-user-label">
                          TOP LEVEL
                        </span>
                      )}
                    </td>

                    {/* STATUS */}

                    <td>
                      {user.role?.active ? (
                        <span className="status-badge status-active">
                          <span className="status-dot" />

                          Active
                        </span>
                      ) : (
                        <span className="status-badge status-inactive">
                          <span className="status-dot" />

                          Inactive
                        </span>
                      )}
                    </td>

                    {/* ACTIONS */}

                    {(canUpdateUsers ||
                      canDeleteUsers) && (
                      <td>
                        <div className="user-actions">
                          {/* EDIT */}

                          {canUpdateUsers &&
                            !(
                              currentUser?.role ===
                                "Admin" &&
                              user.role?.name ===
                                "Admin"
                            ) && (
                              <button
                                className="edit-button"
                                onClick={() =>
                                  editUser(user)
                                }
                              >
                                Edit
                              </button>
                            )}

                          {/* DELETE */}

                          {canDeleteUsers &&
                            !(
                              currentUser?.role ===
                                "Admin" &&
                              user.role?.name ===
                                "Admin"
                            ) && (
                              <button
                                className="delete-button"
                                onClick={() =>
                                  deleteUser(
                                    user,
                                  )
                                }
                              >
                                Delete
                              </button>
                            )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

