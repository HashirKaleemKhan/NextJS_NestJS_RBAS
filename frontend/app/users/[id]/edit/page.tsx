"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type User = {
  id: number;
  name: string;
  email: string;

  role?: {
    id?: number;
    name: string;
    level?: number;
    active?: boolean;
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

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();

  const userId = Number(params.id);

  // -----------------------------------
  // AUTH
  // -----------------------------------

  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // -----------------------------------
  // USER
  // -----------------------------------

  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -----------------------------------
  // MANAGER
  // -----------------------------------

  const [managerId, setManagerId] = useState("");

  const [possibleManagers, setPossibleManagers] =
    useState<PossibleManager[]>([]);

  const [loadingManagers, setLoadingManagers] =
    useState(false);

  // -----------------------------------
  // STATE
  // -----------------------------------

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

    const currentUser =
      getUser() as CurrentUser | null;

    const permissions =
      currentUser?.permissions || [];

    if (!permissions.includes("users.update")) {
      router.replace("/dashboard");
      return;
    }

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

    if (!userId || Number.isNaN(userId)) {
      router.replace("/users");
      return;
    }

    async function loadUser() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/users/${userId}`,
        );

        const loadedUser: User =
          response.data;

        setUser(loadedUser);

        setName(loadedUser.name);
        setEmail(loadedUser.email);

        setManagerId(
          loadedUser.manager
            ? String(loadedUser.manager.id)
            : "",
        );
      } catch (err: any) {
        console.error(
          "Unable to load user:",
          err,
        );

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

        if (
          err?.response?.status === 404
        ) {
          router.replace("/users");
          return;
        }

        setError(
          err?.response?.data?.message ||
            "Unable to load user.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [authorized, userId, router]);

  // -----------------------------------
  // LOAD POSSIBLE MANAGERS
  // -----------------------------------

  useEffect(() => {
    if (!authorized || !userId) {
      return;
    }

    async function loadManagers() {
      setLoadingManagers(true);

      try {
        const response =
          await api.get(
            `/users/${userId}/possible-managers`,
          );

        let managers: PossibleManager[] =
          response.data;

        /*
         * Keep the existing manager in the
         * dropdown if the backend doesn't
         * return them.
         */

        if (
          user?.manager &&
          !managers.some(
            (manager) =>
              manager.id ===
              user.manager?.id,
          )
        ) {
          managers = [
            {
              id: user.manager.id,
              name: user.manager.name,
              email: "",
              role: undefined,
            },
            ...managers,
          ];
        }

        setPossibleManagers(managers);
      } catch (err: any) {
        console.error(
          "Unable to load possible managers:",
          err,
        );

        setPossibleManagers([]);
      } finally {
        setLoadingManagers(false);
      }
    }

    loadManagers();
  }, [
    authorized,
    userId,
    user?.manager,
  ]);

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

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSaving(true);

    try {
      const data: {
        name: string;
        email: string;
        password?: string;
        managerId?: number | null;
      } = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      };

      if (password.trim()) {
        data.password = password;
      }

      data.managerId = managerId
        ? Number(managerId)
        : null;

      await api.patch(
        `/users/${userId}`,
        data,
      );

      router.push("/users");
    } catch (err: any) {
      console.error(
        "Unable to update user:",
        err,
      );

      const message =
        err?.response?.data?.message;

      if (Array.isArray(message)) {
        setError(message.join(", "));
      } else {
        setError(
          message ||
            "Unable to update user.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (checkingAuth || loading) {
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

  if (!authorized || !user) {
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
                  setName(e.target.value)
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
                  setEmail(e.target.value)
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
        setPassword(e.target.value)
      }
      disabled={saving}
    />

    <div className="field-help">
      Leave blank if you do not want to
      change the current password.
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

    <div
      id="role"
      className="edit-role-display"
    >
      {user.role?.name || "No role"}
    </div>

    <div className="field-help">
      The user's role is managed separately
      and cannot be changed from this page.
    </div>
  </div>
</div>

{/* -------------------------------- */}
{/* REPORTS TO */}
{/* -------------------------------- */}

<div className="edit-form-section">
  <div className="form-group">
    <label htmlFor="manager">
      Reports To
    </label>

    {loadingManagers ? (
      <div className="form-input edit-loading">
        Loading managers...
      </div>
    ) : (
      <select
        id="manager"
        className="form-input edit-manager-select"
        value={managerId}
        onChange={(e) =>
          setManagerId(e.target.value)
        }
        disabled={saving}
      >
        <option value="">
          Top level
        </option>

        {possibleManagers.map((manager) => (
          <option
            key={manager.id}
            value={manager.id}
          >
            {manager.name} —{" "}
            {manager.role?.name || "Manager"}
          </option>
        ))}
      </select>
    )}

    <div className="field-help">
      Select who this user reports to.
      Leave as Top level if they do not
      report to another user.
    </div>
  </div>
</div>

{/* -------------------------------- */}
{/* HIERARCHY */}
{/* -------------------------------- */}

<div className="edit-form-section">
  <div className="hierarchy-preview">

    <div className="hierarchy-preview-header">
      <div>
        <div className="hierarchy-preview-title">
          Current hierarchy
        </div>

        <div className="hierarchy-preview-subtitle">
          Reporting relationship for this user
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
            {user.role?.name || "No role"}
          </div>
        </div>
      </div>

      <div className="hierarchy-arrow">
        →
      </div>

      <div className="hierarchy-person">
        <div className="hierarchy-avatar">
          {managerId
            ? (
                possibleManagers.find(
                  (manager) =>
                    manager.id ===
                    Number(managerId),
                )?.name ||
                user.manager?.name ||
                "Manager"
              )
                .charAt(0)
                .toUpperCase()
            : "T"}
        </div>

        <div className="hierarchy-person-info">
          <div className="hierarchy-person-name">
            {managerId
              ? (
                  possibleManagers.find(
                    (manager) =>
                      manager.id ===
                      Number(managerId),
                  )?.name ||
                  user.manager?.name ||
                  "Selected manager"
                )
              : "Top level"}
          </div>

          <div className="hierarchy-person-role">
            {managerId
              ? (
                  possibleManagers.find(
                    (manager) =>
                      manager.id ===
                      Number(managerId),
                  )?.role?.name ||
                  "Manager"
                )
              : "No manager"}
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
                loadingManagers
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