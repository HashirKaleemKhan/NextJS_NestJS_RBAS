"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type Role = {
  id: number;
  name: string;
  level: number;
};

type Manager = {
  id: number;
  name: string;
  role?: {
    name: string;
  };
};

export default function CreateUserPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState("");

  const [possibleManagers, setPossibleManagers] =
    useState<Manager[]>([]);

  const [managerId, setManagerId] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingManagers, setLoadingManagers] = useState(false);

  const [error, setError] = useState("");

  // -----------------------------------
  // CHECK AUTH
  // -----------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const user: any = getUser();

    const permissions: string[] =
      user?.permissions || [];

    // Only Admin has users.create
    if (!permissions.includes("users.create")) {
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
      try {
        const response = await api.get("/roles");

        /*
         * Admin should not create another Admin.
         *
         * Your levels:
         *
         * Admin      = 4
         * Manager    = 3
         * Supervisor = 2
         * Developer   = 1
         */
        const availableRoles = response.data
          .filter(
            (role: Role) =>
              role.level < 4,
          )
          .sort(
            (a: Role, b: Role) =>
              b.level - a.level,
          );

        setRoles(availableRoles);
      } catch (err) {
        console.error(
          "Unable to load roles:",
          err,
        );

        setError(
          "Unable to load available roles.",
        );
      } finally {
        setLoadingRoles(false);
      }
    }

    loadRoles();
  }, [authorized]);

  // -----------------------------------
  // LOAD POSSIBLE MANAGERS
  // -----------------------------------

  useEffect(() => {
    if (!roleId) {
      setPossibleManagers([]);
      setManagerId("");
      return;
    }

    async function loadManagers() {
      setLoadingManagers(true);
      setManagerId("");

      try {
        const response = await api.get(
          `/users/possible-managers-for-role/${roleId}`,
        );

        setPossibleManagers(response.data);
      } catch (err: any) {
        console.error(
          "Unable to load managers:",
          err,
        );

        setPossibleManagers([]);

        setError(
          err?.response?.data?.message ||
            "Unable to load possible managers.",
        );
      } finally {
        setLoadingManagers(false);
      }
    }

    loadManagers();
  }, [roleId]);

  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  async function createUser(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    if (!roleId) {
      setError("Please select a role.");
      setLoading(false);
      return;
    }

    /*
     * Every non-admin user must have
     * a manager.
     */
    if (
      possibleManagers.length > 0 &&
      !managerId
    ) {
      setError(
        "Please select who this user reports to.",
      );
      setLoading(false);
      return;
    }

    try {
      await api.post("/users", {
        name: name.trim(),
        email: email.trim(),
        password,
        roleId: Number(roleId),
        managerId: managerId
          ? Number(managerId)
          : null,
      });

      router.push("/users");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
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
            Add a new user to the application.
          </p>
        </div>

        <button
          className="button button-secondary"
          onClick={() =>
            router.push("/users")
          }
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
              Enter the account details for
              the new user.
            </p>
          </div>
        </div>

        <form
          onSubmit={createUser}
          className="admin-form"
        >
          {error && (
            <div className="alert-error">
              {Array.isArray(error)
                ? error.join(", ")
                : error}
            </div>
          )}

          {/* NAME + EMAIL */}

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
                  setName(e.target.value)
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
                  setEmail(e.target.value)
                }
                required
              />
            </div>
          </div>

          {/* PASSWORD + ROLE */}

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
                  setPassword(e.target.value)
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
                    setRoleId(e.target.value)
                  }
                  required
                >
                  <option value="">
                    Select a role
                  </option>

                  {roles.map((role) => (
                    <option
                      key={role.id}
                      value={role.id}
                    >
                      {role.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="field-help">
                Select the user's position in
                the company hierarchy.
              </div>
            </div>
          </div>

          {/* REPORTS TO */}

          {roleId && (
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
                  No managers are available for
                  this role.
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
                  required
                >
                  <option value="">
                    Select manager
                  </option>

                  {possibleManagers.map(
                    (manager) => (
                      <option
                        key={manager.id}
                        value={manager.id}
                      >
                        {manager.name} —{" "}
                        {manager.role?.name}
                      </option>
                    ),
                  )}
                </select>
              )}

              <div className="field-help">
                The user will report to someone
                one level above their role.
              </div>
            </div>
          )}

          {/* ACTIONS */}

          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                router.push("/users")
              }
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