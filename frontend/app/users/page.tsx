"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type User = {
  id: number;
  name: string;
  email: string;

  role?: {
    name: string;
    level?: number;
  };

  manager?: {
    id: number;
    name: string;
  } | null;
};

type PossibleManager = {
  id: number;
  name: string;
  email: string;

  role?: {
    name: string;
    level: number;
  };
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // -----------------------------------
  // EDIT USER
  // -----------------------------------

  const [editingUser, setEditingUser] =
    useState<User | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editEmail, setEditEmail] =
    useState("");

  const [editPassword, setEditPassword] =
    useState("");

  const [editManagerId, setEditManagerId] =
    useState<string>("");

  const [possibleManagers, setPossibleManagers] =
    useState<PossibleManager[]>([]);

  const [loadingManagers, setLoadingManagers] =
    useState(false);

  const [savingEdit, setSavingEdit] =
    useState(false);

  // -----------------------------------
  // LOAD USERS
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

    async function loadUsers() {
      try {
        const response =
          await api.get("/users");

        setUsers(response.data);
      } catch (err: any) {
        if (
          err?.response?.status === 401
        ) {
          router.replace("/login");
          return;
        }

        if (
          err?.response?.status === 403
        ) {
          router.replace("/dashboard");
          return;
        }

        setError(
          "Unable to load users.",
        );
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
  // DELETE USER
  // -----------------------------------

  async function deleteUser(
    user: User,
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${user.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/users/${user.id}`,
      );

      setUsers(
        (currentUsers) =>
          currentUsers.filter(
            (currentUser) =>
              currentUser.id !== user.id,
          ),
      );
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          "Unable to delete user.",
      );
    }
  }

  // -----------------------------------
  // OPEN EDIT
  // -----------------------------------

  async function openEditUser(
    user: User,
  ) {
    setEditingUser(user);

    setEditName(user.name);

    setEditEmail(user.email);

    setEditPassword("");

    setEditManagerId(
      user.manager
        ? String(user.manager.id)
        : "",
    );

    setPossibleManagers([]);

    /*
     * Load valid managers only if the
     * current user has update permission.
     */
    if (!canUpdateUsers) {
      return;
    }

    setLoadingManagers(true);

    try {
      const response =
        await api.get(
          `/users/${user.id}/possible-managers`,
        );

      setPossibleManagers(
        response.data,
      );
    } catch (err: any) {
      console.error(
        "Unable to load possible managers:",
        err,
      );

      /*
       * We don't close the modal.
       * The user can still edit the
       * normal account information.
       */
    } finally {
      setLoadingManagers(false);
    }
  }

  // -----------------------------------
  // CLOSE EDIT
  // -----------------------------------

  function closeEditUser() {
    if (savingEdit) {
      return;
    }

    setEditingUser(null);

    setEditName("");

    setEditEmail("");

    setEditPassword("");

    setEditManagerId("");

    setPossibleManagers([]);
  }

  // -----------------------------------
  // SAVE EDIT
  // -----------------------------------

  async function saveEditUser() {
  if (!editingUser) {
    return;
  }

  if (!editName.trim()) {
    alert("Name is required.");
    return;
  }

  if (!editEmail.trim()) {
    alert("Email is required.");
    return;
  }

  setSavingEdit(true);

  try {
    const data: {
      name: string;
      email: string;
      password?: string;
      managerId?: number;
    } = {
      name: editName.trim(),
      email: editEmail.trim(),
    };

    if (editPassword.trim()) {
      data.password = editPassword;
    }

    /*
     * Only send managerId when an actual
     * manager has been selected.
     */
    if (canUpdateUsers && editManagerId) {
      data.managerId = Number(editManagerId);
    }

    const response = await api.patch(
      `/users/${editingUser.id}`,
      data,
    );

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === editingUser.id
          ? {
              ...user,
              ...response.data,
            }
          : user,
      ),
    );

    closeEditUser();
  } catch (err: any) {
    alert(
      err?.response?.data?.message ||
        "Unable to update user.",
    );
  } finally {
    setSavingEdit(false);
  }
}

  // -----------------------------------
  // SEARCH
  // -----------------------------------

  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return users;
      }

      return users.filter(
        (user) =>
          user.name
            .toLowerCase()
            .includes(query) ||
          user.email
            .toLowerCase()
            .includes(query) ||
          user.role?.name
            .toLowerCase()
            .includes(query) ||
          user.manager?.name
            .toLowerCase()
            .includes(query),
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
                router.push(
                  "/users/create",
                )
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
                setSearch(
                  e.target.value,
                )
              }
            />
          </div>
        </div>

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
                {filteredUsers.map(
                  (user) => (
                    <tr
                      key={user.id}
                    >
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.name
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </div>

                          <div>
                            <div className="user-name">
                              {user.name}
                            </div>

                            <div className="user-id">
                              ID #
                              {user.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="email-text">
                          {user.email}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`role-badge role-${user.role?.name?.toLowerCase()}`}
                        >
                          {user.role
                            ?.name ||
                            "Developer"}
                        </span>
                      </td>

                      <td>
                        {user.manager ? (
                          <div>
                            <div className="user-name">
                              {user
                                .manager
                                .name}
                            </div>

                            <div className="user-id">
                              ID #
                              {
                                user
                                  .manager
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

                      <td>
                        <span className="status-badge">
                          <span className="status-dot" />

                          Active
                        </span>
                      </td>

                      {(canUpdateUsers ||
                        canDeleteUsers) && (
                        <td>
                          <div className="user-actions">
                            {canUpdateUsers &&
  !(
    currentUser?.role === "Admin" &&
    user.role?.name === "Admin"
  ) && (
    <button
      className="edit-button"
      onClick={() => openEditUser(user)}
    >
      Edit
    </button>
  )}

                            {canDeleteUsers &&
  !(
    currentUser?.role === "Admin" &&
    user.role?.name === "Admin"
  ) && (
    <button
      className="delete-button"
      onClick={() => deleteUser(user)}
    >
      Delete
    </button>
  )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -------------------------------- */}
      {/* EDIT MODAL */}
      {/* -------------------------------- */}

      {editingUser && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <div className="modal-header">
              <div>
                <h2>Edit user</h2>

                <p>
                  Update{" "}
                  {
                    editingUser.name
                  }
                  's account and
                  hierarchy.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={
                  closeEditUser
                }
                disabled={
                  savingEdit
                }
              >
                ×
              </button>
            </div>

            {/* NAME */}

            <div className="form-group">
              <label htmlFor="edit-name">
                Name
              </label>

              <input
                id="edit-name"
                className="form-input"
                value={editName}
                onChange={(e) =>
                  setEditName(
                    e.target.value,
                  )
                }
              />
            </div>

            {/* EMAIL */}

            <div className="form-group">
              <label htmlFor="edit-email">
                Email
              </label>

              <input
                id="edit-email"
                type="email"
                className="form-input"
                value={editEmail}
                onChange={(e) =>
                  setEditEmail(
                    e.target.value,
                  )
                }
              />
            </div>

            {/* PASSWORD */}

            <div className="form-group">
              <label htmlFor="edit-password">
                New password
              </label>

              <input
                id="edit-password"
                type="password"
                className="form-input"
                placeholder="Leave blank to keep current password"
                value={
                  editPassword
                }
                onChange={(e) =>
                  setEditPassword(
                    e.target.value,
                  )
                }
              />
            </div>

            {/* REPORTS TO */}

{canUpdateUsers && (
  <div className="form-group">
    <label htmlFor="edit-manager">
      Reports To
    </label>

    {loadingManagers ? (
      <div className="form-input">
        Loading managers...
      </div>
    ) : possibleManagers.length === 0 ? (
      <div className="form-input">
        No valid managers available.
      </div>
    ) : (
      <select
        id="edit-manager"
        className="form-input"
        value={editManagerId}
        onChange={(e) =>
          setEditManagerId(e.target.value)
        }
      >
        {possibleManagers.map((manager) => (
          <option
            key={manager.id}
            value={manager.id}
          >
            {manager.name} —{" "}
            {manager.role?.name}
          </option>
        ))}
      </select>
    )}
  </div>
)}

            {/* HIERARCHY INFO */}

            <div
              style={{
                marginTop:
                  "8px",
                marginBottom:
                  "20px",
                padding:
                  "12px 14px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.04)",
                fontSize:
                  "13px",
              }}
            >
              <strong>
                Current hierarchy
              </strong>

              <div
                style={{
                  marginTop:
                    "6px",
                }}
              >
                {editingUser.manager ? (
                  <>
                    {
                      editingUser.name
                    }{" "}
                    →{" "}
                    {
                      editingUser
                        .manager
                        .name
                    }
                  </>
                ) : (
                  <>
                    {
                      editingUser.name
                    }{" "}
                    → Top level
                  </>
                )}
              </div>
            </div>

            {/* ACTIONS */}

            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={
                  closeEditUser
                }
                disabled={
                  savingEdit
                }
              >
                Cancel
              </button>

              <button
                className="button button-primary"
                onClick={
                  saveEditUser
                }
                disabled={
                  savingEdit
                }
              >
                {savingEdit
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}