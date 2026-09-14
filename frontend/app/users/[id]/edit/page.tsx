"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

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

  reportsToRoleId: number | null;

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
  active: boolean;

  role?: {
    id?: number;
    name: string;
    level?: number;
    active?: boolean;
    isAdmin?: boolean;
    group?: Group | null;
    reportsToRoleId?: number | null;
    reportsToRole?: {
      id: number;
      name: string;
      isAdmin: boolean;
      active: boolean;
    } | null;
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
    id?: number;
    name: string;
    level?: number;
    isAdmin?: boolean;
    active?: boolean;
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

  const [active, setActive] =
    useState(true);

  // -----------------------------------
  // ROLES
  // -----------------------------------

  const [roleId, setRoleId] =
    useState("");

  const [roles, setRoles] =
    useState<Role[]>([]);

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
  // AUTH
  // -----------------------------------

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const current =
      getUser() as CurrentUser | null;

    setCurrentUser(current);

    const permissions =
      current?.permissions || [];

    if (
      !permissions.includes(
        "users.update",
      )
    ) {
      router.replace("/dashboard");
      return;
    }

    setAuthorized(true);
    setCheckingAuth(false);
  }, [router]);

  // -----------------------------------
  // LOAD USER + ROLES
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

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        /*
         * Only load the user and roles.
         *
         * The user's role already contains
         * the group information, so there is
         * no need to call GET /groups.
         */
        const [
          userResponse,
        ] = await Promise.all([
          api.get<User>(
            `/users/${userId}`,
          ),
        ]);

        const loadedUser =
          userResponse.data;

        setUser(loadedUser);

        const rolesResponse =
        await api.get<{
          data: Role[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        }>("/roles", {
          params: {
            page: 1,
            limit: 100,
          },
        });

      setRoles(rolesResponse.data.data);

        setName(
          loadedUser.name || "",
        );

        setEmail(
          loadedUser.email || "",
        );

        setActive(
          loadedUser.active,
        );

        if (
          loadedUser.role?.id !==
          undefined
        ) {
          setRoleId(
            String(
              loadedUser.role.id,
            ),
          );
        } else {
          setRoleId("");
        }

        setManagerId(
          loadedUser.manager
            ? String(
                loadedUser.manager.id,
              )
            : "",
        );
      } catch (err: any) {
        console.error(
          "Unable to load user:",
          err,
        );

        if (
          err?.response?.status ===
          401
        ) {
          router.replace("/login");
          return;
        }

        if (
          err?.response?.status ===
          404
        ) {
          router.replace("/users");
          return;
        }

        /*
         * Do not redirect on 403 here.
         *
         * The backend is responsible for
         * deciding whether this user can be
         * managed. A 403 should be shown
         * instead of silently redirecting.
         */
        const message =
          err?.response?.data?.message;

        if (Array.isArray(message)) {
          setError(
            message.join(", "),
          );
        } else {
          setError(
            message ||
              "Unable to load user.",
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [
    authorized,
    userId,
    router,
  ]);

  // -----------------------------------
  // FIND ROLE
  // -----------------------------------

  function getSelectedRole() {
    if (roleId) {
      return roles.find(
        (role) =>
          role.id ===
          Number(roleId),
      );
    }

    if (!user?.role) {
      return undefined;
    }

    if (
      user.role.id !==
      undefined
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
  // FIND GROUP
  // -----------------------------------

  function getGroupName() {
    const selectedRole =
      getSelectedRole();

    /*
     * Group comes directly from the
     * selected role returned by /roles.
     */
    if (selectedRole?.group?.name) {
      return selectedRole.group.name;
    }

    /*
     * Fallback to the user's current
     * role group returned by /users/:id.
     */
    if (user?.role?.group?.name) {
      return user.role.group.name;
    }

    return "Unassigned";
  }

  // -----------------------------------
  // LOAD POSSIBLE MANAGERS
  // -----------------------------------

  useEffect(() => {
    if (
      !authorized ||
      !userId ||
      !user ||
      !roleId
    ) {
      setPossibleManagers([]);
      setLoadingManagers(false);
      return;
    }

    const selectedRole =
      roles.find(
        (role) =>
          role.id ===
          Number(roleId),
      );

    // -----------------------------------
    // NO MANAGER REQUIRED
    // -----------------------------------

    if (
      !selectedRole ||
      selectedRole.isAdmin ||
      selectedRole.reportsToRoleId ===
        null
    ) {
      setPossibleManagers([]);
      setLoadingManagers(false);
      return;
    }

    async function loadManagers() {
      setLoadingManagers(true);

      try {
        const response =
          await api.get<
            PossibleManager[]
          >(
            `/users/possible-managers-for-role/${roleId}`,
          );

        /*
         * The backend is the source of truth.
         *
         * Do not manually inject the old
         * manager.
         */
        const managers =
  response.data;

            setPossibleManagers(
              managers,
            );

            /*
            * If the current manager is no longer
            * eligible, automatically clear the
            * manager selection.
            */
            if (
              managerId &&
              !managers.some(
                (manager) =>
                  manager.id ===
                  Number(managerId),
              )
            ) {
              setManagerId("");
            }
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
    user,
    roleId,
    roles,
  ]);

  // -----------------------------------
  // SAVE
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
    // VALIDATION
    // -----------------------------------

    if (!name.trim()) {
      alert(
        "Full name is required.",
      );
      return;
    }

    if (!email.trim()) {
      alert(
        "Email address is required.",
      );
      return;
    }

    if (!roleId) {
      alert(
        "Role is required.",
      );
      return;
    }

    if (
      !/^\S+@\S+\.\S+$/.test(
        email.trim(),
      )
    ) {
      alert(
        "Enter a valid email address.",
      );
      return;
    }

    if (
      password.trim() &&
      password.length < 6
    ) {
      alert(
        "New password must be at least 6 characters.",
      );
      return;
    }

    const selectedRole =
      roles.find(
        (role) =>
          role.id ===
          Number(roleId),
      );

    if (!selectedRole) {
      alert(
        "Please select a valid role.",
      );
      return;
    }

    setSaving(true);

    try {
      // -----------------------------------
      // UPDATE USER DETAILS
      // -----------------------------------

      const data: {
        name: string;
        email: string;
        password?: string;
        roleId: number;
        managerId?: number | null;
        active: boolean;
      } = {
        name: name.trim(),

        email: email
          .trim()
          .toLowerCase(),

        roleId: Number(roleId),
        active,
      };

      if (password.trim()) {
        data.password =
          password;
      }

      /*
        * Only send a manager when the
        * selected role actually requires one.
        */
        if (
          !selectedRole.isAdmin &&
          selectedRole.reportsToRoleId !== null
        ) {
          // Explicitly send null when Unassigned is selected.
          data.managerId =
            managerId === ""
              ? null
              : Number(managerId);
        } else {
          data.managerId = null;
        }

      await api.patch(
        `/users/${userId}`,
        data,
      );
      
      router.replace("/users?success=updated");
    } catch (err: any) {
      console.error(
        "Unable to update user:",
        err,
      );

      const message =
        err?.response?.data?.message;

      if (
        Array.isArray(message)
      ) {
        setError(
          message.join(", "),
        );
      } else {
        alert(
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

  const selectedRole =
    getSelectedRole();

  const roleName =
    selectedRole?.name ||
    user.role?.name ||
    "No role";

  const groupName =
    getGroupName();

  const currentManager =
    managerId
      ? possibleManagers.find(
          (manager) =>
            manager.id ===
            Number(managerId),
        )
      : null;

  // -----------------------------------
  // PAGE
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

            <h1>
              Edit User
            </h1>

            <p>
              Update this user's
              details.
            </p>
          </div>

          <div className="company-page-actions">
            <button
              type="button"
              className="company-secondary-button"
              onClick={() =>
                router.push(
                  "/users",
                )
              }
              disabled={saving}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* -------------------------------- */}
        {/* FORM */}
        {/* -------------------------------- */}

        <div className="company-user-view-panel">
          <div className="company-user-information">
            <h3>
              User Information
            </h3>

            <form
              onSubmit={saveUser}
              className="company-create-user-form"
            >
              {error && (
                <div className="company-users-error">
                  {error}
                </div>
              )}

              {/* NAME + EMAIL */}

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
                    disabled={saving}
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
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD + STATUS */}

              <div className="company-create-form-grid">
                <div className="company-create-form-group">
                  <label htmlFor="password">
                    New Password
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

                  <span className="company-create-form-help">
                    Leave blank if you do not
                    want to change the current
                    password.
                  </span>
                </div>

                <div className="company-create-form-group">
                  <label htmlFor="user-status">
                    User Status
                  </label>

                  <select
                    id="user-status"
                    value={
                      active
                        ? "active"
                        : "inactive"
                    }
                    onChange={(e) =>
                      setActive(
                        e.target.value ===
                          "active",
                      )
                    }
                    disabled={saving}
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>

                  <span className="company-create-form-help">
                    This controls the user's
                    account status independently
                    from their role status.
                  </span>
                </div>
              </div>

              {/* ROLE + GROUP */}

              <div className="company-create-form-grid">
                <div className="company-create-form-group">
                  <label htmlFor="role">
                    Role
                  </label>

                  <select
                    id="role"
                    value={roleId}
                    onChange={(e) => {
                      const newRoleId =
                        e.target.value;

                      setRoleId(
                        newRoleId,
                      );

                      /*
                       * The old manager may no
                       * longer be valid for the
                       * newly selected role.
                       */
                      setManagerId("");

                      setPossibleManagers(
                        [],
                      );
                    }}
                    disabled={saving}
                    required
                  >
                    <option value="">
                      Select a role
                    </option>

                    {roles
                      .filter(
                        (role) =>
                          role.active &&
                          !role.isAdmin,
                      )
                      .map(
                        (role) => (
                          <option
                            key={
                              role.id
                            }
                            value={
                              role.id
                            }
                          >
                            {role.name}
                          </option>
                        ),
                      )}
                  </select>

                  <span className="company-create-form-help">
                    Select the role assigned
                    to this user.
                  </span>
                </div>

                <div className="company-create-form-group">
                  <label>
                    Group
                  </label>

                  <div className="company-create-form-readonly company-create-group-field">
                    <span>
                      {groupName}
                    </span>

                    <span className="company-create-group-badge">
                      From selected role
                    </span>
                  </div>

                  <span className="company-create-form-help">
                    Group is determined by the
                    user's role.
                  </span>
                </div>
              </div>

              {/* REPORTING ROLE + REPORTS TO */}

              <div className="company-create-form-grid">
                <div className="company-create-form-group">
                  <label>
                    Reporting Role
                  </label>

                  <div className="company-create-form-readonly">
                    {selectedRole
                      ?.reportsToRole
                      ?.name ||
                      "No reporting role"}
                  </div>

                  <span className="company-create-form-help">
                    This is determined by the
                    selected role.
                  </span>
                </div>

                {selectedRole &&
                  !selectedRole.isAdmin &&
                  selectedRole
                    .reportsToRoleId !==
                    null && (
                    <div className="company-create-form-group">
                      <label htmlFor="manager">
                        Reports To
                      </label>

                      {loadingManagers ? (
                        <div className="company-create-form-readonly">
                          Loading managers...
                        </div>
                      ) : (
                        <select
                          id="manager"
                          value={managerId}
                          onChange={(e) =>
                            setManagerId(
                              e.target
                                .value,
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          <option value="">
                            Unassigned
                          </option>

                          {possibleManagers.map(
                            (
                              manager,
                            ) => (
                              <option
                                key={
                                  manager.id
                                }
                                value={
                                  manager.id
                                }
                              >
                                {
                                  manager.name
                                }{" "}
                                —{" "}
                                {manager
                                  .role
                                  ?.name ||
                                  "Manager"}
                              </option>
                            ),
                          )}
                        </select>
                      )}

                      <span className="company-create-form-help">
                        Only active users with
                        the role required by{" "}
                        <strong>
                          {
                            selectedRole.name
                          }
                        </strong>{" "}
                        are shown.
                      </span>
                    </div>
                  )}

                {selectedRole &&
                  (selectedRole.isAdmin ||
                    selectedRole
                      .reportsToRoleId ===
                      null) && (
                    <div className="company-create-form-group">
                      <label>
                        Reports To
                      </label>

                      <div className="company-create-form-readonly">
                        {selectedRole.isAdmin
                          ? "No manager"
                          : "No reporting role"}
                      </div>

                      <span className="company-create-form-help">
                        {selectedRole.isAdmin
                          ? "Administrator users do not report to another user."
                          : "This role does not require a reporting manager."}
                      </span>
                    </div>
                  )}
              </div>

              {/* ADMIN INFO */}

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

              {/* HIERARCHY */}

              <div className="company-create-full-width">
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
                          {roleName}
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
                              currentManager
                                ?.name ||
                              user.manager
                                ?.name ||
                              "Manager"
                            )
                              .charAt(
                                0,
                              )
                              .toUpperCase()
                          : "U"}
                      </div>

                      <div className="hierarchy-person-info">
                        <div className="hierarchy-person-name">
                          {managerId
                            ? currentManager
                                ?.name ||
                              user.manager
                                ?.name ||
                              "Selected manager"
                            : "Unassigned"}
                        </div>

                        <div className="hierarchy-person-role">
                          {managerId
                            ? currentManager
                                ?.role
                                ?.name ||
                              "Manager"
                            : "Manager not currently assigned"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}

              <div className="company-create-form-actions">
                <button
                  type="button"
                  className="company-secondary-button"
                  onClick={() =>
                    router.push(
                      "/users",
                    )
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="company-primary-button"
                  disabled={
                    saving ||
                    loadingManagers
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}