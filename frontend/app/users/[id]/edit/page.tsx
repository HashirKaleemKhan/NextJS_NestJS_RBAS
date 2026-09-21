"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

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

const USER_QUERY = gql`
  query UserForEdit($id: Int!) {
    user(id: $id) {
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
        active
      }
      manager {
        id
        name
      }
    }
  }
`;

const ROLES_QUERY = gql`
  query RolesForEditUser(
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
        active
      }
    }
  }
`;

const UPDATE_USER_MUTATION = gql`
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
      active
      roleId
      managerId
      groupId
      role {
        id
        name
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

type User = {
  id: number;
  name: string;
  email: string;
  active: boolean;
  roleId: number;
  managerId: number | null;
  groupId: number | null;

  role?: {
    id?: number;
    name: string;
    active?: boolean;
  } | null;

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
    active?: boolean;
  } | null;
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

type UserQueryData = {
  user: User;
};

type UserQueryVariables = {
  id: number;
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
  possibleManagersForRole: PossibleManager[];
};

type ManagersQueryVariables = {
  roleId: number;
};

type UpdateUserMutationData = {
  updateUser: User;
};

type UpdateUserMutationVariables = {
  id: number;
  input: {
    name?: string;
    email?: string;
    password?: string;
    roleId?: number;
    managerId?: number | null;
    active?: boolean;
  };
};

// -----------------------------------
// PAGE
// -----------------------------------

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

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const errorRef =
    useRef<HTMLDivElement | null>(null);

  // -----------------------------------
  // SCROLL TO ERROR
  // -----------------------------------

  useEffect(() => {
    if (!error) {
      return;
    }

    errorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [error]);

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
  // LOAD USER
  // -----------------------------------

  const {
    data: userData,
    loading: userLoading,
    error: userQueryError,
  } = useQuery<
    UserQueryData,
    UserQueryVariables
  >(USER_QUERY, {
    variables: {
      id: userId,
    },
    skip:
      !authorized ||
      !userId ||
      Number.isNaN(userId),
    fetchPolicy: "network-only",
  });

  // -----------------------------------
  // LOAD ROLES
  // -----------------------------------

  const {
    data: rolesData,
    loading: rolesLoading,
    error: rolesQueryError,
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

  // -----------------------------------
  // SET USER DATA
  // -----------------------------------

  useEffect(() => {
    if (!authorized) {
      return;
    }

    if (userQueryError) {
      console.error(
        "Unable to load user:",
        userQueryError,
      );

      setError(
        userQueryError.message ||
          "Unable to load user.",
      );

      return;
    }

    if (!userData?.user) {
      return;
    }

    const loadedUser =
      userData.user;

    setUser(loadedUser);

    setName(
      loadedUser.name || "",
    );

    setEmail(
      loadedUser.email || "",
    );

    setActive(
      loadedUser.active,
    );

    setRoleId(
      String(
        loadedUser.roleId,
      ),
    );

    setManagerId(
      loadedUser.managerId !==
        null
        ? String(
            loadedUser.managerId,
          )
        : "",
    );
  }, [
    authorized,
    userData,
    userQueryError,
  ]);

  // -----------------------------------
  // SET ROLES
  // -----------------------------------

  useEffect(() => {
    if (!authorized) {
      return;
    }

    if (rolesQueryError) {
      console.error(
        "Unable to load roles:",
        rolesQueryError,
      );

      setError(
        rolesQueryError.message ||
          "Unable to load available roles.",
      );

      return;
    }

    if (!rolesData?.roles?.data) {
      return;
    }

    setRoles(
      rolesData.roles.data,
    );
  }, [
    authorized,
    rolesData,
    rolesQueryError,
  ]);

  // -----------------------------------
  // SELECTED ROLE
  // -----------------------------------

  const selectedRole =
    roles.find(
      (role) =>
        role.id ===
        Number(roleId),
    );

  // -----------------------------------
  // LOAD POSSIBLE MANAGERS
  // -----------------------------------

  const shouldLoadManagers =
    authorized &&
    !!user &&
    !!roleId &&
    !!selectedRole &&
    !selectedRole.isAdmin &&
    selectedRole.reportsToRoleId !==
      null;

  const {
    data: managersData,
    loading: managersQueryLoading,
    error: managersQueryError,
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
        !shouldLoadManagers,
      fetchPolicy: "network-only",
    },
  );

  // -----------------------------------
  // SET MANAGERS
  // -----------------------------------

  useEffect(() => {
    if (!shouldLoadManagers) {
      setPossibleManagers([]);
      setLoadingManagers(false);
      return;
    }

    setLoadingManagers(
      managersQueryLoading,
    );

    if (managersQueryError) {
      console.error(
        "Unable to load possible managers:",
        managersQueryError,
      );

      setPossibleManagers([]);
      return;
    }

    if (!managersData) {
      return;
    }

    const managers =
      managersData.possibleManagersForRole ||
      [];

    /*
     * Never allow the user being edited
     * to appear as their own manager.
     *
     * This is especially important when
     * changing the user's role before saving,
     * because the backend still sees the
     * user's current database role.
     */
    const filteredManagers =
      managers.filter(
        (manager) =>
          manager.id !== userId,
      );

    setPossibleManagers(
      filteredManagers,
    );

    /*
     * If the current manager is no longer
     * eligible for the selected role,
     * automatically clear the selection.
     */
    if (
      managerId &&
      !filteredManagers.some(
        (manager) =>
          manager.id ===
          Number(managerId),
      )
    ) {
      setManagerId("");
    }
  }, [
    shouldLoadManagers,
    managersData,
    managersQueryLoading,
    managersQueryError,
    userId,
    managerId,
  ]);

  // -----------------------------------
  // UPDATE USER MUTATION
  // -----------------------------------

  const [
    updateUserMutation,
    {
      loading: updateUserLoading,
    },
  ] = useMutation<
    UpdateUserMutationData,
    UpdateUserMutationVariables
  >(UPDATE_USER_MUTATION);

  // -----------------------------------
  // HANDLE ROLE CHANGE
  // -----------------------------------

  function handleRoleChange(
    newRoleId: string,
  ) {
    setRoleId(newRoleId);

    /*
     * The old manager may no longer be
     * valid for the newly selected role.
     */
    setManagerId("");

    setPossibleManagers([]);

    setError("");
  }

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

    if (!roleId) {
      setError(
        "Role is required.",
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

    if (
      password.trim() &&
      password.length < 6
    ) {
      setError(
        "New password must be at least 6 characters.",
      );
      return;
    }

    const role =
      roles.find(
        (item) =>
          item.id ===
          Number(roleId),
      );

    if (!role) {
      setError(
        "Please select a valid role.",
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
        input.password =
          password;
      }

      /*
       * Only send a manager when the
       * selected role actually requires one.
       *
       * Explicitly send null when the user
       * selects Unassigned.
       */
      if (
        !role.isAdmin &&
        role.reportsToRoleId !== null
      ) {
        input.managerId =
          managerId === ""
            ? null
            : Number(managerId);
      } else {
        input.managerId = null;
      }

      await updateUserMutation({
        variables: {
          id: userId,
          input,
        },
      });

      router.replace(
        "/users?success=updated",
      );
    } catch (err: any) {
      console.error(
        "Unable to update user:",
        err,
      );

      const message =
        err?.message;

      setError(
        message ||
          "Unable to update user.",
      );
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (
    checkingAuth ||
    userLoading ||
    rolesLoading
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
  // DISPLAY DATA
  // -----------------------------------

  const roleName =
    selectedRole?.name ||
    user.role?.name ||
    "No role";

  const groupName =
    selectedRole?.group?.name ||
    "Unassigned";

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
                <div
                  ref={errorRef}
                  className="company-users-error"
                >
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
                    onChange={(e) =>
                      handleRoleChange(
                        e.target.value,
                      )
                    }
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
                          value={
                            managerId
                          }
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
                    loadingManagers ||
                    updateUserLoading
                  }
                >
                  {saving ||
                  updateUserLoading
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