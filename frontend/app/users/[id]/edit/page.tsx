"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { graphqlRequest } from "@/lib/graphql";
import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type Role = {
  id: number;
  name: string;
  isAdmin: boolean;
  active: boolean;
  reportsToRoleId?: number | null;
  reportsToRole?: {
    id: number;
    name: string;
    isAdmin: boolean;
    active: boolean;
  } | null;
};

type User = {
  id: number;
  name: string;
  email: string;

  role?: Role;

  manager?: {
    id: number;
    name: string;

    role?: {
      id: number;
      name: string;
      isAdmin: boolean;
      active: boolean;
    } | null;
  } | null;
};

type PossibleManager = {
  id: number;
  name: string;
  email: string;

  role?: {
    id: number;
    name: string;
    isAdmin: boolean;
    active: boolean;
  } | null;
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

type UserQueryResponse = {
  user: User;
};

type RolesResponse = {
  rolesForUserCreation: Role[];
};

type PossibleManagersResponse = {
  possibleManagers: PossibleManager[];
};

type PossibleManagersForRoleResponse = {
  possibleManagersForRole: PossibleManager[];
};

type UpdateUserResponse = {
  updateUser: {
    id: number;
    name: string;
    email: string;
  };
};

const USER_QUERY = `
  query User($id: Int!) {
    user(id: $id) {
      id
      name
      email

      role {
        id
        name
        isAdmin
        active
        reportsToRoleId

        reportsToRole {
          id
          name
          isAdmin
          active
        }
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

const ROLES_QUERY = `
  query {
    rolesForUserCreation {
      id
      name
      isAdmin
      active
      reportsToRoleId

      reportsToRole {
        id
        name
        isAdmin
        active
      }
    }
  }
`;

const POSSIBLE_MANAGERS_QUERY = `
  query PossibleManagers($id: Int!) {
    possibleManagers(id: $id) {
      id
      name
      email

      role {
        id
        name
        isAdmin
        active
      }
    }
  }
`;

const POSSIBLE_MANAGERS_FOR_ROLE_QUERY = `
  query PossibleManagersForRole($roleId: Int!) {
    possibleManagersForRole(roleId: $roleId) {
      id
      name
      email

      role {
        id
        name
        isAdmin
        active
      }
    }
  }
`;

const UPDATE_USER_MUTATION = `
  mutation UpdateUser(
    $id: Int!
    $input: UpdateUserInput!
  ) {
    updateUser(
      id: $id
      input: $input
    ) {
      id
      name
      email
    }
  }
`;

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();

  const userId = Number(params.id);

  // -----------------------------------
  // AUTH
  // -----------------------------------

  const [authorized, setAuthorized] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  // -----------------------------------
  // USER
  // -----------------------------------

  const [user, setUser] =
    useState<User | null>(null);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  // -----------------------------------
  // ROLE
  // -----------------------------------

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [selectedRoleId, setSelectedRoleId] =
    useState<number | null>(null);

  const [loadingRoles, setLoadingRoles] =
    useState(false);

  // -----------------------------------
  // MANAGER
  // -----------------------------------

  const [managerId, setManagerId] =
    useState("");

  const [possibleManagers, setPossibleManagers] =
    useState<PossibleManager[]>([]);

  const [loadingManagers, setLoadingManagers] =
    useState(false);

  // -----------------------------------
  // STATE
  // -----------------------------------

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // -----------------------------------
  // CHECK AUTH
  // -----------------------------------

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const loadedCurrentUser =
      getUser() as CurrentUser | null;

    const permissions =
      loadedCurrentUser?.permissions || [];

    if (
      !permissions.includes("users.update")
    ) {
      router.replace("/dashboard");
      return;
    }

    setCurrentUser(loadedCurrentUser);
    setAuthorized(true);
    setCheckingAuth(false);
  }, [router]);

  // -----------------------------------
  // LOAD USER
  // -----------------------------------

  useEffect(() => {
    if (!authorized) {
      return;
    }

    if (
      !userId ||
      Number.isNaN(userId)
    ) {
      router.replace("/users");
      return;
    }

    async function loadUser() {
      try {
        setLoading(true);
        setError("");

        const response =
          await graphqlRequest<UserQueryResponse>(
            USER_QUERY,
            {
              id: userId,
            },
          );

        const loadedUser =
          response.user;

        setUser(loadedUser);

        setName(loadedUser.name);
        setEmail(loadedUser.email);

        setSelectedRoleId(
          loadedUser.role?.id ?? null,
        );

        setManagerId(
          loadedUser.manager
            ? String(
                loadedUser.manager.id,
              )
            : "",
        );
      } catch (err: any) {
        const message =
          err?.message ||
          "Unable to load user.";

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

        if (
          message
            .toLowerCase()
            .includes("not found")
        ) {
          router.replace("/users");
          return;
        }

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [
    authorized,
    userId,
    router,
  ]);

  // -----------------------------------
  // CAN CHANGE ROLE
  // -----------------------------------

  const canChangeRole =
    currentUser?.permissions?.includes(
      "users.create",
    ) ?? false;

  // -----------------------------------
  // LOAD ROLES
  // -----------------------------------

  useEffect(() => {
    if (
      !authorized ||
      !userId ||
      !user ||
      !currentUser ||
      !canChangeRole
    ) {
      return;
    }

    const currentUserData = user;
    const currentRole = currentUserData.role;

    async function loadRoles() {
      setLoadingRoles(true);

      try {
        const response =
          await graphqlRequest<RolesResponse>(
            ROLES_QUERY,
          );

        let loadedRoles =
          response.rolesForUserCreation;

        /*
         * Keep the current role visible even
         * if it is inactive.
         */
        if (
          currentRole &&
          !loadedRoles.some(
            (role) =>
              role.id === currentRole.id,
          )
        ) {
          loadedRoles = [
            currentRole,
            ...loadedRoles,
          ];
        }

        setRoles(loadedRoles);
      } catch {
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    }

    loadRoles();
  }, [
    authorized,
    userId,
    user,
    currentUser,
    canChangeRole,
  ]);

  // -----------------------------------
  // LOAD CURRENT POSSIBLE MANAGERS
  // -----------------------------------

  useEffect(() => {
    if (
      !authorized ||
      !userId ||
      !user
    ) {
      return;
    }

    const currentUserData = user;
    const currentManager =
      currentUserData.manager;

    async function loadManagers() {
      setLoadingManagers(true);

      try {
        const response =
          await graphqlRequest<PossibleManagersResponse>(
            POSSIBLE_MANAGERS_QUERY,
            {
              id: userId,
            },
          );

        let managers =
          response.possibleManagers;

        /*
         * Keep the existing manager in the
         * dropdown if the backend doesn't
         * return them.
         */
        if (
          currentManager &&
          !managers.some(
            (manager) =>
              manager.id ===
              currentManager.id,
          )
        ) {
          managers = [
            {
              id: currentManager.id,
              name: currentManager.name,
              email: "",
              role: currentManager.role,
            },
            ...managers,
          ];
        }

        setPossibleManagers(managers);
      } catch {
        setPossibleManagers([]);
      } finally {
        setLoadingManagers(false);
      }
    }

    loadManagers();
  }, [
    authorized,
    userId,
    user,
  ]);

  // -----------------------------------
  // LOAD MANAGERS WHEN ROLE CHANGES
  // -----------------------------------

  useEffect(() => {
    if (
      !authorized ||
      !canChangeRole ||
      !user ||
      !selectedRoleId
    ) {
      return;
    }

    const currentUserData = user;
    const originalRoleId =
      currentUserData.role?.id;

    /*
     * Do not reload managers for the original
     * role during initial page load.
     */
    if (
      selectedRoleId === originalRoleId
    ) {
      return;
    }

    const selectedRole =
      roles.find(
        (role) =>
          role.id === selectedRoleId,
      );

    if (!selectedRole) {
      return;
    }

    /*
     * Administrators are the only true
     * top-level users.
     */
    if (selectedRole.isAdmin) {
      setPossibleManagers([]);
      setManagerId("");
      setLoadingManagers(false);
      return;
    }

    /*
     * A non-admin role must have a reporting
     * role.
     */
    if (
      selectedRole.reportsToRoleId === null ||
      selectedRole.reportsToRoleId === undefined
    ) {
      setPossibleManagers([]);
      setManagerId("");
      setLoadingManagers(false);
      return;
    }

    async function loadManagersForRole() {
      try {
        setLoadingManagers(true);

        const response =
          await graphqlRequest<PossibleManagersForRoleResponse>(
            POSSIBLE_MANAGERS_FOR_ROLE_QUERY,
            {
              roleId: selectedRoleId,
            },
          );

        setPossibleManagers(
          response.possibleManagersForRole,
        );

        /*
         * A role change invalidates the old
         * manager.
         */
        setManagerId("");
      } catch (err: any) {
        setPossibleManagers([]);

        setError(
          err?.message ||
            "Unable to load possible managers.",
        );
      } finally {
        setLoadingManagers(false);
      }
    }

    loadManagersForRole();
  }, [
    authorized,
    canChangeRole,
    user,
    selectedRoleId,
    roles,
  ]);

  // -----------------------------------
  // ROLE CHANGE
  // -----------------------------------

  function handleRoleChange(
    roleId: number,
  ) {
    setSelectedRoleId(roleId);
    setManagerId("");
    setPossibleManagers([]);
    setError("");
  }

  // -----------------------------------
  // SELECTED ROLE
  // -----------------------------------

  const selectedRole =
    roles.find(
      (role) =>
        role.id === selectedRoleId,
    ) ||
    user?.role;

  // -----------------------------------
  // SELECTED MANAGER
  // -----------------------------------

  const selectedManager =
    possibleManagers.find(
      (manager) =>
        manager.id ===
        Number(managerId),
    );

  // -----------------------------------
  // HIERARCHY STATE
  // -----------------------------------

  const isSelectedRoleAdmin =
    selectedRole?.isAdmin === true;

  const roleHasReportingRole =
    !isSelectedRoleAdmin &&
    selectedRole?.reportsToRoleId !== null &&
    selectedRole?.reportsToRoleId !== undefined;

  const managersAvailable =
    possibleManagers.length > 0;

  const managerRequired =
    roleHasReportingRole &&
    managersAvailable;

  // -----------------------------------
  // SAVE USER
  // -----------------------------------

  async function saveUser(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setError("");

    // -----------------------------------
    // NAME
    // -----------------------------------

    if (!name.trim()) {
      alert("Name is required.");
      return;
    }

    // -----------------------------------
    // EMAIL
    // -----------------------------------

    if (!email.trim()) {
      alert("Email is required.");
      return;
    }

    // -----------------------------------
    // PASSWORD
    // -----------------------------------

    if (
      password.trim() &&
      password.trim().length < 6
    ) {
      alert(
        "New password must be at least 6 characters.",
      );
      return;
    }

    // -----------------------------------
    // ROLE
    // -----------------------------------

    if (!selectedRoleId) {
      alert("Role is required.");
      return;
    }

    // -----------------------------------
    // NON-ADMIN ROLE MUST HAVE
    // REPORTING ROLE
    // -----------------------------------

    if (
      selectedRole &&
      !selectedRole.isAdmin &&
      (
        selectedRole.reportsToRoleId === null ||
        selectedRole.reportsToRoleId ===
          undefined
      )
    ) {
      alert(
        "The selected non-administrator role does not have a reporting role.",
      );
      return;
    }

    // -----------------------------------
    // MANAGER REQUIRED
    // -----------------------------------

    if (
      managerRequired &&
      !managerId
    ) {
      alert(
        `Reports To is required for the selected ${
          selectedRole?.name || "role"
        }.`,
      );
      return;
    }

    setSaving(true);

    try {
      const input: {
        name: string;
        email: string;
        password?: string;
        roleId: number;
        managerId: number | null;
      } = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        roleId: selectedRoleId,

        /*
         * Admins are always top level.
         *
         * Non-admins may temporarily have
         * no manager only when no eligible
         * manager exists.
         */
        managerId:
          isSelectedRoleAdmin
            ? null
            : managerId
              ? Number(managerId)
              : null,
      };

      if (password.trim()) {
        input.password =
          password.trim();
      }

      await graphqlRequest<UpdateUserResponse>(
        UPDATE_USER_MUTATION,
        {
          id: userId,
          input,
        },
      );

      router.push("/users");
    } catch (err: any) {
      const message =
        err?.message ||
        "Unable to update user.";

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (
    checkingAuth ||
    loading
  ) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          {checkingAuth
            ? "Checking permissions..."
            : "Loading user..."}
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // SAFETY
  // -----------------------------------

  if (
    !authorized ||
    !user
  ) {
    return null;
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

          <h1>Edit user</h1>

          <p>
            Update {user.name}'s account
            and reporting hierarchy.
          </p>
        </div>

        <button
          className="button button-secondary"
          onClick={() =>
            router.push("/users")
          }
          type="button"
          disabled={saving}
        >
          ← Back to users
        </button>
      </div>

      <div className="form-card">
        <div className="form-card-header">
          <div className="form-card-icon">
            ✎
          </div>

          <div>
            <h2>User information</h2>

            <p>
              Update the account details
              and reporting hierarchy.
            </p>
          </div>
        </div>

        <form
          onSubmit={saveUser}
          className="admin-form"
        >
          {error && (
            <div className="alert-error">
              {Array.isArray(error)
                ? error.join(", ")
                : error}
            </div>
          )}

          {/* -------------------------------- */}
          {/* NAME + EMAIL */}
          {/* -------------------------------- */}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">
                Full name
              </label>

              <input
                id="name"
                type="text"
                placeholder="e.g. Ahmed Khan"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value,
                  )
                }
                disabled={saving}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                type="email"
                placeholder="e.g. ahmed@company.com"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value,
                  )
                }
                disabled={saving}
                required
              />
            </div>
          </div>

          {/* -------------------------------- */}
          {/* PASSWORD */}
          {/* -------------------------------- */}

          <div className="edit-form-section">
            <div className="form-group">
              <label htmlFor="password">
                New password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value,
                  )
                }
                disabled={saving}
              />

              <div className="field-help">
                Leave blank if you do not want
                to change the current password.
              </div>
            </div>
          </div>

          {/* -------------------------------- */}
          {/* ROLE */}
          {/* -------------------------------- */}

          <div className="edit-form-section">
            <div className="form-group">
              <label htmlFor="role">
                Role
              </label>

              {canChangeRole ? (
                loadingRoles ? (
                  <div className="form-input edit-loading">
                    Loading roles...
                  </div>
                ) : (
                  <select
                    id="role"
                    className="form-input"
                    value={
                      selectedRoleId ?? ""
                    }
                    onChange={(e) =>
                      handleRoleChange(
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                    disabled={saving}
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select role
                    </option>

                    {roles.map(
                      (role) => (
                        <option
                          key={role.id}
                          value={role.id}
                          disabled={
                            !role.active
                          }
                        >
                          {role.name}
                          {!role.active
                            ? " (Inactive)"
                            : ""}
                        </option>
                      ),
                    )}
                  </select>
                )
              ) : (
                <div className="edit-role-display">
                  {user.role?.name ||
                    "No role"}
                </div>
              )}

              <div className="field-help">
                {canChangeRole
                  ? "Changing the role updates the user's reporting hierarchy."
                  : "Only administrators can change a user's role."}
              </div>
            </div>
          </div>

          {/* -------------------------------- */}
          {/* ROLE HIERARCHY */}
          {/* -------------------------------- */}

          <div className="edit-form-section">
            <div className="form-group">
              <label>
                Role hierarchy
              </label>

              <div className="hierarchy-preview">
                <div className="hierarchy-preview-body">
                  <div>
                    <div className="hierarchy-preview-title">
                      {isSelectedRoleAdmin
                        ? "This user is an administrator and will be at the top level."
                        : selectedRole?.reportsToRole
                          ? `This user will report to a ${selectedRole.reportsToRole.name}.`
                          : "This role does not have a reporting role."}
                    </div>

                    <div className="hierarchy-preview-subtitle">
                      {isSelectedRoleAdmin
                        ? "Administrators do not report to another user."
                        : selectedRole?.reportsToRole
                          ? `The required reporting role is ${selectedRole.reportsToRole.name}.`
                          : "The selected non-administrator role cannot be assigned without a reporting role."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------- */}
          {/* REPORTS TO */}
          {/* -------------------------------- */}

          {!isSelectedRoleAdmin &&
            roleHasReportingRole && (
              <div className="edit-form-section">
                <div className="form-group">
                  <label htmlFor="manager">
                    Reports To
                  </label>

                  {loadingManagers ? (
                    <div className="form-input edit-loading">
                      Loading managers...
                    </div>
                  ) : possibleManagers.length ===
                    0 ? (
                    <>
                      <div className="hierarchy-preview">
                        <div className="hierarchy-preview-body">
                          <div>
                            <div className="hierarchy-preview-title">
                              No active users currently
                              exist with the required
                              reporting role.
                            </div>

                            <div className="hierarchy-preview-subtitle">
                              The user can be saved
                              without a manager and
                              assigned one later.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="field-help">
                        Only active users with the
                        role required by{" "}
                        {selectedRole?.name ||
                          "the selected role"}{" "}
                        are shown.
                      </div>
                    </>
                  ) : (
                    <>
                      <select
                        id="manager"
                        className="form-input edit-manager-select"
                        value={managerId}
                        onChange={(e) =>
                          setManagerId(
                            e.target.value,
                          )
                        }
                        disabled={saving}
                        required={
                          managerRequired
                        }
                      >
                        <option
                          value=""
                          disabled
                        >
                          Select{" "}
                          {selectedRole
                            ?.reportsToRole
                            ?.name ||
                            "manager"}
                        </option>

                        {possibleManagers.map(
                          (manager) => (
                            <option
                              key={manager.id}
                              value={manager.id}
                            >
                              {manager.name} —{" "}
                              {manager.role
                                ?.name ||
                                "Manager"}
                            </option>
                          ),
                        )}
                      </select>

                      <div className="field-help">
                        Select an active user with
                        the required{" "}
                        {selectedRole
                          ?.reportsToRole
                          ?.name ||
                          "reporting role"}{" "}
                        role.
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

          {/* -------------------------------- */}
          {/* ADMIN HIERARCHY */}
          {/* -------------------------------- */}

          {isSelectedRoleAdmin && (
            <div className="edit-form-section">
              <div className="hierarchy-preview">
                <div className="hierarchy-preview-body">
                  <div>
                    <div className="hierarchy-preview-title">
                      Top level
                    </div>

                    <div className="hierarchy-preview-subtitle">
                      Administrators do not report
                      to another user.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------- */}
          {/* CURRENT HIERARCHY */}
          {/* -------------------------------- */}

          <div className="edit-form-section">
            <div className="hierarchy-preview">
              <div className="hierarchy-preview-header">
                <div>
                  <div className="hierarchy-preview-title">
                    Current hierarchy
                  </div>

                  <div className="hierarchy-preview-subtitle">
                    Reporting relationship for
                    this user
                  </div>
                </div>
              </div>

              <div className="hierarchy-preview-body">
                <div className="hierarchy-person">
                  <div className="hierarchy-avatar">
                    {user.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="hierarchy-person-info">
                    <div className="hierarchy-person-name">
                      {user.name}
                    </div>

                    <div className="hierarchy-person-role">
                      {selectedRole?.name ||
                        "No role"}
                    </div>
                  </div>
                </div>

                <div className="hierarchy-arrow">
                  →
                </div>

                <div className="hierarchy-person">
                  <div className="hierarchy-avatar">
                    {isSelectedRoleAdmin
                      ? "A"
                      : managerId
                        ? (
                            selectedManager?.name ||
                            user.manager?.name ||
                            "Manager"
                          )
                            .charAt(0)
                            .toUpperCase()
                        : "U"}
                  </div>

                  <div className="hierarchy-person-info">
                    <div className="hierarchy-person-name">
                      {isSelectedRoleAdmin
                        ? "Top level"
                        : managerId
                          ? selectedManager?.name ||
                            user.manager?.name ||
                            "Selected manager"
                          : "Unassigned"}
                    </div>

                    <div className="hierarchy-person-role">
                      {isSelectedRoleAdmin
                        ? "Administrator"
                        : managerId
                          ? selectedManager
                              ?.role
                              ?.name ||
                            user.manager?.role
                              ?.name ||
                            "Manager"
                          : "Manager not currently assigned"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------- */}
          {/* ACTIONS */}
          {/* -------------------------------- */}

          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                router.push("/users")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button button-primary"
              disabled={
                saving ||
                loadingManagers ||
                loadingRoles
              }
            >
              {saving
                ? "Saving..."
                : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}