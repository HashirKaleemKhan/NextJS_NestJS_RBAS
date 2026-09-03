"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { graphqlRequest } from "@/lib/graphql";
import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type Role = {
  id: number;
  name: string;
  isAdmin: boolean;
  active: boolean;
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
    isAdmin: boolean;
    active: boolean;
  };
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

type RolesForUserCreationResponse = {
  rolesForUserCreation: Role[];
};

type PossibleManagersResponse = {
  possibleManagersForRole: Manager[];
};

type CreateUserResponse = {
  createUser: {
    id: number;
    name: string;
    email: string;
  };
};

const ROLES_FOR_USER_CREATION_QUERY = `
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

const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

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
  // LOADING
  // -----------------------------------

  const [loading, setLoading] =
    useState(false);

  const [loadingRoles, setLoadingRoles] =
    useState(true);

  const [loadingManagers, setLoadingManagers] =
    useState(false);

  // -----------------------------------
  // ERROR
  // -----------------------------------

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

  useEffect(() => {
    if (!authorized) {
      return;
    }

    async function loadRoles() {
      setLoadingRoles(true);
      setError("");

      try {
        const data =
          await graphqlRequest<RolesForUserCreationResponse>(
            ROLES_FOR_USER_CREATION_QUERY,
          );

        const availableRoles =
          data.rolesForUserCreation
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
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load available roles.",
        );
      } finally {
        setLoadingRoles(false);
      }
    }

    loadRoles();
  }, [authorized]);

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
  // LOAD POSSIBLE MANAGERS
  // -----------------------------------

  useEffect(() => {
    if (!authorized || !roleId) {
      setPossibleManagers([]);
      setManagerId("");
      return;
    }

    async function loadManagers() {
      setLoadingManagers(true);
      setError("");
      setManagerId("");

      try {
        const data =
          await graphqlRequest<PossibleManagersResponse>(
            POSSIBLE_MANAGERS_QUERY,
            {
              roleId: Number(roleId),
            },
          );

        setPossibleManagers(
          data.possibleManagersForRole,
        );
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

    loadManagers();
  }, [authorized, roleId]);

  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  async function createUser(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setError("");

    // -----------------------------------
    // BASIC VALIDATION
    // -----------------------------------

    if (!name.trim()) {
      setError(
        "Name is required.",
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Email is required.",
      );
      return;
    }

    if (!password) {
      setError(
        "Password is required.",
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
    // ADMIN ROLE
    // -----------------------------------

    if (selectedRole.isAdmin) {
      setManagerId("");
    }

    // -----------------------------------
    // NORMAL ROLE
    // -----------------------------------

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
      await graphqlRequest<CreateUserResponse>(
        CREATE_USER_MUTATION,
        {
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
      );

      router.push("/users");
    } catch (err: any) {
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
  // UI
  // -----------------------------------

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            USER MANAGEMENT
          </div>

          <h1>Create user</h1>

          <p>
            Add a new user to the
            application.
          </p>
        </div>

        <button
          className="button button-secondary"
          onClick={() =>
            router.push("/users")
          }
          type="button"
        >
          ← Back to users
        </button>
      </div>

      <div className="form-card">
        <div className="form-card-header">
          <div className="form-card-icon">
            +
          </div>

          <div>
            <h2>User information</h2>

            <p>
              Enter the account details
              and hierarchy information
              for the new user.
            </p>
          </div>
        </div>

        <form
          onSubmit={createUser}
          className="admin-form"
        >
          {error && (
            <div className="alert-error">
              {error}
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
                required
              />
            </div>
          </div>

          {/* -------------------------------- */}
          {/* PASSWORD + ROLE */}
          {/* -------------------------------- */}

          <div className="form-row">
            <div className="form-group">
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
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">
                Role
              </label>

              {loadingRoles ? (
                <div className="form-input">
                  Loading roles...
                </div>
              ) : (
                <select
                  id="role"
                  className="form-input"
                  value={roleId}
                  onChange={(e) =>
                    handleRoleChange(
                      e.target.value,
                    )
                  }
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

              <div className="field-help">
                Select the user's
                position in the company
                hierarchy.
              </div>
            </div>
          </div>

          {/* -------------------------------- */}
          {/* REPORTING ROLE INFO */}
          {/* -------------------------------- */}

          {selectedRole &&
            !selectedRole.isAdmin && (
              <div
                style={{
                  marginTop: "4px",
                  marginBottom: "20px",
                  padding:
                    "12px 14px",
                  borderRadius: "8px",
                  background:
                    "rgba(255,255,255,0.04)",
                  fontSize: "13px",
                }}
              >
                <strong>
                  Role hierarchy
                </strong>

                <div
                  style={{
                    marginTop: "6px",
                  }}
                >
                  {selectedRole.reportsToRole ? (
                    <>
                      This user will
                      report to a{" "}
                      <strong>
                        {
                          selectedRole
                            .reportsToRole
                            .name
                        }
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      This role does
                      not currently
                      have a reporting
                      role configured.
                    </>
                  )}
                </div>
              </div>
            )}

          {/* -------------------------------- */}
          {/* REPORTS TO */}
          {/* -------------------------------- */}

          {selectedRole &&
            !selectedRole.isAdmin &&
            selectedRole
              .reportsToRoleId !==
              null && (
              <div className="form-group">
                <label htmlFor="manager">
                  Reports To
                </label>

                {loadingManagers ? (
                  <div className="form-input">
                    Loading managers...
                  </div>
                ) : possibleManagers.length ===
                  0 ? (
                  <div className="field-help">
                    No active users currently
                    exist with the required
                    reporting role.
                    <br />
                    The user can be created
                    without a manager and
                    assigned one later.
                  </div>
                ) : (
                  <select
                    id="manager"
                    className="form-input"
                    value={managerId}
                    onChange={(e) =>
                      setManagerId(
                        e.target.value,
                      )
                    }
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

                <div className="field-help">
                  Only active users with
                  the role required by{" "}
                  <strong>
                    {
                      selectedRole
                        .name
                    }
                  </strong>{" "}
                  are shown.
                </div>
              </div>
            )}

          {/* -------------------------------- */}
          {/* ADMIN INFO */}
          {/* -------------------------------- */}

          {selectedRole?.isAdmin && (
            <div className="field-help">
              Administrator users do not
              report to another user.
            </div>
          )}

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
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button button-primary"
              disabled={
                loading ||
                loadingRoles ||
                loadingManagers
              }
            >
              {loading
                ? "Creating..."
                : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
