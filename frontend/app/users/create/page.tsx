"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { gql } from "@apollo/client";
import {
  useMutation,
  useQuery,
} from "@apollo/client/react";

import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

// -----------------------------------
// GRAPHQL
// -----------------------------------

const ROLES_QUERY = gql`
  query RolesForCreateUser(
    $page: Int
    $limit: Int
  ) {
    roles(
      page: $page
      limit: $limit
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
          isAdmin
          active
        }
      }
    }
  }
`;

const POSSIBLE_MANAGERS_FOR_ROLE_QUERY = gql`
  query PossibleManagersForRole(
    $roleId: Int!
  ) {
    possibleManagersForRole(
      roleId: $roleId
    ) {
      id
      name
      email
      role {
        id
        name
        level
        active
      }
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUser(
    $input: CreateUserInput!
  ) {
    createUser(input: $input) {
      id
      name
      email
      active
      roleId
      managerId
      groupId
      role {
        id
        name
        level
        active
      }
      manager {
        id
        name
      }
    }
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
    isAdmin: boolean;
    active: boolean;
  } | null;
};

type Manager = {
  id: number;
  name: string;
  email: string;

  role?: {
    id: number;
    name: string;
    level?: number | null;
    active?: boolean | null;
  } | null;
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

type RolesQueryData = {
  roles: {
    data: Role[];
  };
};

type RolesQueryVariables = {
  page?: number;
  limit?: number;
};

type ManagersQueryData = {
  possibleManagersForRole: Manager[];
};

type ManagersQueryVariables = {
  roleId: number;
};

type CreateUserMutationData = {
  createUser: {
    id: number;
    name: string;
    email: string;
    active: boolean;
    roleId: number;
    managerId: number | null;
    groupId: number | null;
  };
};

type CreateUserMutationVariables = {
  input: {
    name: string;
    email: string;
    password: string;
    roleId: number;
    managerId: number | null;
  };
};

// -----------------------------------
// PAGE
// -----------------------------------

export default function CreateUserPage() {
  const router = useRouter();

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
  // FORM
  // -----------------------------------

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [roleId, setRoleId] =
    useState("");

  const [managerId, setManagerId] =
    useState("");

  // -----------------------------------
  // DATA
  // -----------------------------------

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [possibleManagers, setPossibleManagers] =
    useState<Manager[]>([]);

  const [selectedRole, setSelectedRole] =
    useState<Role | null>(null);

  // -----------------------------------
  // LOADING / ERROR
  // -----------------------------------

  const [loading, setLoading] =
    useState(false);

  const [loadingManagers, setLoadingManagers] =
    useState(false);

  const [error, setError] =
    useState("");

  // -----------------------------------
  // AUTH CHECK
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

    const permissions =
      user?.permissions || [];

    if (
      !permissions.includes(
        "users.create",
      )
    ) {
      router.replace("/dashboard");
      return;
    }

    setAuthorized(true);
    setCheckingAuth(false);
  }, [router]);

  // -----------------------------------
  // LOAD ROLES
  // -----------------------------------

  const {
    data: rolesData,
    loading: rolesLoading,
    error: rolesError,
  } = useQuery<
    RolesQueryData,
    RolesQueryVariables
  >(ROLES_QUERY, {
    variables: {
      page: 1,
      limit: 100,
    },
    skip: !authorized,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (!authorized) {
      return;
    }

    if (rolesError) {
      console.error(
        "Unable to load roles:",
        rolesError,
      );

      setError(
        rolesError.message ||
          "Unable to load available roles.",
      );

      return;
    }

    if (!rolesData?.roles?.data) {
      return;
    }

    /*
     * This page only needs Roles as lookup
     * data for the role selector.
     *
     * Admin roles are excluded because the
     * backend does not allow the current user
     * to create another Admin.
     *
     * Backend remains the final authority.
     */

    const availableRoles =
      rolesData.roles.data
        .filter(
          (role) =>
            !role.isAdmin &&
            role.active,
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
            ),
        );

    setRoles(availableRoles);
  }, [
    authorized,
    rolesData,
    rolesError,
  ]);

  // -----------------------------------
  // LOAD POSSIBLE MANAGERS
  // -----------------------------------

  const {
    data: managersData,
    loading: managersQueryLoading,
    error: managersError,
  } = useQuery<
    ManagersQueryData,
    ManagersQueryVariables
  >(
    POSSIBLE_MANAGERS_FOR_ROLE_QUERY,
    {
      variables: {
        roleId: Number(roleId),
      },
      skip:
        !authorized ||
        !roleId ||
        selectedRole?.isAdmin === true ||
        selectedRole?.reportsToRoleId === null,
      fetchPolicy: "network-only",
    },
  );

  useEffect(() => {
    if (
      !authorized ||
      !roleId ||
      !selectedRole ||
      selectedRole.isAdmin ||
      selectedRole.reportsToRoleId === null
    ) {
      setPossibleManagers([]);
      setManagerId("");
      setLoadingManagers(false);
      return;
    }

    setLoadingManagers(
      managersQueryLoading,
    );

    if (managersError) {
      console.error(
        "Unable to load managers:",
        managersError,
      );

      setPossibleManagers([]);
      setManagerId("");

      setError(
        managersError.message ||
          "Unable to load possible managers.",
      );

      return;
    }

    if (managersData) {
      setPossibleManagers(
        managersData.possibleManagersForRole ||
          [],
      );
    }
  }, [
    authorized,
    roleId,
    selectedRole,
    managersData,
    managersQueryLoading,
    managersError,
  ]);

  // -----------------------------------
  // CREATE USER MUTATION
  // -----------------------------------

  const [
    createUserMutation,
    {
      loading: createUserLoading,
    },
  ] = useMutation<
    CreateUserMutationData,
    CreateUserMutationVariables
  >(CREATE_USER_MUTATION);

  // -----------------------------------
  // HANDLE ROLE CHANGE
  // -----------------------------------

  function handleRoleChange(
    newRoleId: string,
  ) {
    setRoleId(newRoleId);

    setManagerId("");

    setPossibleManagers([]);

    setError("");

    const role =
      roles.find(
        (item) =>
          String(item.id) ===
          newRoleId,
      ) || null;

    setSelectedRole(role);
  }

  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  async function createUser(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setError("");

    // -----------------------------------
    // VALIDATION
    // -----------------------------------

    if (!name.trim()) {
      setError(
        "Full name is required.",
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Email address is required.",
      );
      return;
    }

    if (
      !/^\S+@\S+\.\S+$/.test(
        email.trim(),
      )
    ) {
      setError(
        "Enter a valid email address.",
      );
      return;
    }

    if (!password) {
      setError(
        "Password is required.",
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters.",
      );
      return;
    }

    if (!roleId) {
      setError(
        "Please select a role.",
      );
      return;
    }

    if (!selectedRole) {
      setError(
        "Selected role could not be found.",
      );
      return;
    }

    // -----------------------------------
    // HIERARCHY
    // -----------------------------------

    /*
     * Admin users never have a manager.
     */

    if (selectedRole.isAdmin) {
      setManagerId("");
    }

    /*
     * Normal roles that have a reporting role:
     *
     * - managers exist -> manager is required
     * - no managers exist -> allow temporary
     *   unassigned creation
     */

    if (
      !selectedRole.isAdmin &&
      selectedRole.reportsToRoleId !== null &&
      possibleManagers.length > 0 &&
      !managerId
    ) {
      setError(
        "Please select who this user reports to.",
      );
      return;
    }

    setLoading(true);

    try {
      await createUserMutation({
        variables: {
          input: {
            name: name.trim(),

            email: email
              .trim()
              .toLowerCase(),

            password,

            roleId: Number(roleId),

            managerId:
              selectedRole.isAdmin
                ? null
                : managerId
                  ? Number(managerId)
                  : null,
          },
        },
      });

      router.replace(
        "/users?success=created",
      );
    } catch (err: any) {
      console.error(
        "Unable to create user:",
        err,
      );

      const message =
        err?.message;

      setError(
        message ||
          "Unable to create user.",
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (checkingAuth) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Checking permissions...
        </div>
      </DashboardLayout>
    );
  }

  if (!authorized) {
    return null;
  }

  // -----------------------------------
  // SELECTED GROUP
  // -----------------------------------

  const selectedGroupName =
    selectedRole?.group?.name ||
    "Unassigned";

  // -----------------------------------
  // UI
  // -----------------------------------

  return (
    <DashboardLayout>
      <div className="company-users-page">
        {/* -------------------------------- */}
        {/* PAGE HEADER */}
        {/* -------------------------------- */}

        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              USER MANAGEMENT
            </div>

            <h1>Add User</h1>

            <p>
              Create a new user account.
            </p>
          </div>

          <div className="company-page-actions">
            <button
              type="button"
              className="company-secondary-button"
              onClick={() =>
                router.push("/users")
              }
              disabled={loading}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* -------------------------------- */}
        {/* FORM PANEL */}
        {/* -------------------------------- */}

        <div className="company-user-view-panel">
          <div className="company-user-information">
            <h3>User Information</h3>

            <form
              onSubmit={createUser}
              className="company-create-user-form"
            >
              {error && (
                <div className="company-users-error">
                  {error}
                </div>
              )}

              {/* -------------------------------- */}
              {/* NAME + EMAIL */}
              {/* -------------------------------- */}

              <div className="company-create-form-grid">
                <div className="company-create-form-group">
                  <label htmlFor="name">
                    Full Name
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
                    disabled={loading}
                    required
                  />
                </div>

                <div className="company-create-form-group">
                  <label htmlFor="email">
                    Email Address
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
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* -------------------------------- */}
              {/* PASSWORD + ROLE */}
              {/* -------------------------------- */}

              <div className="company-create-form-grid">
                <div className="company-create-form-group">
                  <label htmlFor="password">
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value,
                      )
                    }
                    disabled={loading}
                    required
                  />

                  <span className="company-create-form-help">
                    Minimum 6 characters.
                  </span>
                </div>

                <div className="company-create-form-group">
                  <label htmlFor="role">
                    Role
                  </label>

                  {rolesLoading ? (
                    <div className="company-create-form-readonly">
                      Loading roles...
                    </div>
                  ) : (
                    <select
                      id="role"
                      value={roleId}
                      onChange={(e) =>
                        handleRoleChange(
                          e.target.value,
                        )
                      }
                      disabled={loading}
                      required
                    >
                      <option value="">
                        Select a role
                      </option>

                      {roles.map(
                        (role) => (
                          <option
                            key={role.id}
                            value={role.id}
                          >
                            {role.name}
                          </option>
                        ),
                      )}
                    </select>
                  )}

                  <span className="company-create-form-help">
                    Select the user's position
                    in the company hierarchy.
                  </span>
                </div>
              </div>

              {/* -------------------------------- */}
              {/* GROUP */}
              {/* -------------------------------- */}

              <div className="company-create-form-grid">
                <div className="company-create-form-group">
                  <label htmlFor="group">
                    Group
                  </label>

                  <div
                    id="group"
                    className="company-create-form-readonly company-create-group-field"
                  >
                    <span>
                      {selectedGroupName}
                    </span>

                    {selectedRole && (
                      <span className="company-create-group-badge">
                        From selected role
                      </span>
                    )}
                  </div>

                  <span className="company-create-form-help">
                    Group is determined by the
                    selected role.
                  </span>
                </div>

                <div className="company-create-form-group">
                  <label>
                    Role Hierarchy
                  </label>

                  <div className="company-create-form-readonly company-create-hierarchy-field">
                    {!selectedRole ? (
                      <span className="company-create-muted">
                        Select a role to see its
                        hierarchy.
                      </span>
                    ) : selectedRole
                        .reportsToRole ? (
                      <span>
                        Reports to{" "}
                        <strong>
                          {
                            selectedRole
                              .reportsToRole
                              .name
                          }
                        </strong>
                      </span>
                    ) : (
                      <span>
                        No reporting role
                        configured.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* -------------------------------- */}
              {/* REPORTS TO */}
              {/* -------------------------------- */}

              {selectedRole &&
                !selectedRole.isAdmin &&
                selectedRole
                  .reportsToRoleId !==
                  null && (
                  <div className="company-create-form-group company-create-full-width">
                    <label htmlFor="manager">
                      Reports To
                    </label>

                    {loadingManagers ? (
                      <div className="company-create-form-readonly">
                        Loading managers...
                      </div>
                    ) : possibleManagers.length ===
                      0 ? (
                      <div className="company-create-info-box">
                        <strong>
                          No manager currently
                          available.
                        </strong>

                        <span>
                          No active users currently
                          exist with the required
                          reporting role. The user
                          can be created without a
                          manager and assigned one
                          later.
                        </span>
                      </div>
                    ) : (
                      <select
                        id="manager"
                        value={managerId}
                        onChange={(e) =>
                          setManagerId(
                            e.target.value,
                          )
                        }
                        disabled={loading}
                      >
                        <option value="">
                          Select manager
                        </option>

                        {possibleManagers.map(
                          (manager) => (
                            <option
                              key={manager.id}
                              value={
                                manager.id
                              }
                            >
                              {manager.name}{" "}
                              —{" "}
                              {
                                manager.role
                                  ?.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    )}

                    <span className="company-create-form-help">
                      Only active users with the
                      role required by{" "}
                      <strong>
                        {selectedRole.name}
                      </strong>{" "}
                      are shown.
                    </span>
                  </div>
                )}

              {/* -------------------------------- */}
              {/* ADMIN INFORMATION */}
              {/* -------------------------------- */}

              {selectedRole?.isAdmin && (
                <div className="company-create-info-box">
                  <strong>
                    Administrator role
                  </strong>

                  <span>
                    Administrator users do not
                    report to another user.
                  </span>
                </div>
              )}

              {/* -------------------------------- */}
              {/* ACTIONS */}
              {/* -------------------------------- */}

              <div className="company-create-form-actions">
                <button
                  type="button"
                  className="company-secondary-button"
                  onClick={() =>
                    router.push("/users")
                  }
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="company-primary-button"
                  disabled={
                    loading ||
                    rolesLoading ||
                    loadingManagers ||
                    createUserLoading
                  }
                >
                  {loading ||
                  createUserLoading
                    ? "Creating..."
                    : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}