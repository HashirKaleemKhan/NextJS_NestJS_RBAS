"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role?: string;
  permissions?: string[];
};

type User = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;
  role?: {
    name: string;
    active: boolean;
  } | null;
};

type Role = {
  id: number;
  name: string;
  isAdmin: boolean;
  active: boolean;
  permissions?: {
    permission: {
      id: number;
      name: string;
    };
  }[];
};

type Group = {
  id: number;
  name: string;
  active: boolean;
};

type UsersQueryData = {
  users: {
    data: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type RolesQueryData = {
  roles: {
    data: Role[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type GroupsQueryData = {
  groups: {
    data: Group[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

const USERS_QUERY = gql`
  query DashboardUsers(
    $page: Int
    $limit: Int
  ) {
    users(
      page: $page
      limit: $limit
      search: ""
    ) {
      data {
        id
        name
        email
        createdAt
        active

        role {
          name
          active
        }
      }

      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

const ROLES_QUERY = gql`
  query DashboardRoles(
    $page: Int
    $limit: Int
  ) {
    roles(
      page: $page
      limit: $limit
      search: ""
    ) {
      data {
        id
        name
        isAdmin
        active

        permissions {
          permission {
            id
            name
          }
        }
      }

      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

const GROUPS_QUERY = gql`
  query DashboardGroups(
    $page: Int
    $limit: Int
  ) {
    groups(
      page: $page
      limit: $limit
      search: ""
    ) {
      data {
        id
        name
        active
      }

      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

function StatCard({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: string;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <div className="company-stat-card">
      <div className="company-stat-content">
        <p className="company-stat-label">
          {label}
        </p>

        <p className="company-stat-value">
          {value}
        </p>
      </div>

      <div
        className={`company-stat-icon ${iconClass}`}
      >
        <span>{icon}</span>
      </div>
    </div>
  );
}

function RecentUser({
  user,
  index,
}: {
  user: User;
  index: number;
}) {
  const initials =
    user.name
      ?.split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="company-activity-item">
      <div
        className={`company-activity-dot company-activity-dot-${index}`}
      />

      <div className="company-activity-user">
        <div className="company-activity-avatar">
          {initials}
        </div>

        <div className="company-activity-info">
          <p>
            <span className="company-activity-name">
              {user.name}
            </span>

            <span className="company-activity-action">
              {" "}
              is registered in the system
            </span>
          </p>

          <span className="company-activity-email">
            {user.email}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [users, setUsers] =
    useState<User[]>([]);

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [groups, setGroups] =
    useState<Group[]>([]);

  const [totalUsers, setTotalUsers] =
    useState(0);

  const [totalRoles, setTotalRoles] =
    useState(0);

  const [totalGroups, setTotalGroups] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [canReadUsers, setCanReadUsers] =
    useState(false);

  const [canManageRoles, setCanManageRoles] =
    useState(false);

  const [authorized, setAuthorized] =
    useState(false);

  /*
   * Read the current JWT user and determine
   * which dashboard data the current user
   * is allowed to request.
   */
  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const currentUser =
      getUser() as CurrentUser | null;

    const permissions: string[] =
      currentUser?.permissions || [];

    if (
      !permissions.includes(
        "dashboard.view",
      )
    ) {
      if (
        permissions.includes(
          "users.read",
        )
      ) {
        router.replace("/users");
        return;
      }

      if (
        permissions.includes(
          "roles.manage",
        )
      ) {
        router.replace("/roles");
        return;
      }

      router.replace(
        "/access-denied",
      );

      return;
    }

    setUser(currentUser);

    setCanReadUsers(
      permissions.includes(
        "users.read",
      ),
    );

    setCanManageRoles(
      permissions.includes(
        "roles.manage",
      ),
    );

    setAuthorized(true);
  }, [router]);

  /*
   * USERS
   *
   * Only execute this query when the
   * current user has users.read.
   */
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useQuery<UsersQueryData>(
    USERS_QUERY,
    {
      variables: {
        page: 1,
        limit: 100,
      },
      skip:
        !authorized ||
        !canReadUsers,
      fetchPolicy: "network-only",
    },
  );

  /*
   * ROLES
   *
   * Only execute when the current user
   * has roles.manage.
   */
  const {
    data: rolesData,
    loading: rolesLoading,
    error: rolesError,
  } = useQuery<RolesQueryData>(
    ROLES_QUERY,
    {
      variables: {
        page: 1,
        limit: 100,
      },
      skip:
        !authorized ||
        !canManageRoles,
      fetchPolicy: "network-only",
    },
  );

  /*
   * GROUPS
   *
   * The existing dashboard only requested
   * groups when roles.manage was available,
   * so preserve that behavior.
   */
  const {
    data: groupsData,
    loading: groupsLoading,
    error: groupsError,
  } = useQuery<GroupsQueryData>(
    GROUPS_QUERY,
    {
      variables: {
        page: 1,
        limit: 100,
      },
      skip:
        !authorized ||
        !canManageRoles,
      fetchPolicy: "network-only",
    },
  );

  /*
   * Apply GraphQL results to the existing
   * dashboard state.
   */
  useEffect(() => {
    if (!authorized) {
      return;
    }

    if (canReadUsers) {
      const userResult =
        usersData?.users;

      setUsers(
        userResult?.data || [],
      );

      setTotalUsers(
        userResult?.pagination?.total ??
          userResult?.data?.length ??
          0,
      );
    } else {
      setUsers([]);
      setTotalUsers(0);
    }
  }, [
    authorized,
    canReadUsers,
    usersData,
  ]);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    if (canManageRoles) {
      const roleResult =
        rolesData?.roles;

      setRoles(
        roleResult?.data || [],
      );

      setTotalRoles(
        roleResult?.pagination?.total ??
          roleResult?.data?.length ??
          0,
      );
    } else {
      setRoles([]);
      setTotalRoles(0);
    }
  }, [
    authorized,
    canManageRoles,
    rolesData,
  ]);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    if (canManageRoles) {
      const groupResult =
        groupsData?.groups;

      setGroups(
        groupResult?.data || [],
      );

      setTotalGroups(
        groupResult?.pagination?.total ??
          groupResult?.data?.length ??
          0,
      );
    } else {
      setGroups([]);
      setTotalGroups(0);
    }
  }, [
    authorized,
    canManageRoles,
    groupsData,
  ]);

  /*
   * Authentication / authorization errors.
   */
  useEffect(() => {
    const error =
      usersError ||
      rolesError ||
      groupsError;

    if (!error) {
      return;
    }

    const message =
      error.message || "";

    if (
      message.includes(
        "Unauthorized",
      ) ||
      message.includes(
        "Authentication",
      ) ||
      message.includes(
        "jwt",
      )
    ) {
      router.replace("/login");
      return;
    }

    if (
      message.includes(
        "Forbidden",
      ) ||
      message.includes(
        "permission",
      )
    ) {
      router.replace(
        "/access-denied",
      );
    }
  }, [
    usersError,
    rolesError,
    groupsError,
    router,
  ]);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const usersDone =
      !canReadUsers ||
      !usersLoading;

    const rolesDone =
      !canManageRoles ||
      !rolesLoading;

    const groupsDone =
      !canManageRoles ||
      !groupsLoading;

    if (
      usersDone &&
      rolesDone &&
      groupsDone
    ) {
      setLoading(false);
    }
  }, [
    authorized,
    canReadUsers,
    canManageRoles,
    usersLoading,
    rolesLoading,
    groupsLoading,
  ]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Loading...
        </div>
      </DashboardLayout>
    );
  }

   const activeUsers =
  users.filter(
    (item) => item.active === true,
  ).length;

  const activeRoles =
    roles.filter(
      (item) => item.active,
    ).length;

  const activeGroups =
    groups.filter(
      (item) => item.active,
    ).length;

  const permissionNames =
    Array.from(
      new Set(
        roles.flatMap(
          (role) =>
            role.permissions?.map(
              (item) =>
                item.permission.name,
            ) || [],
        ),
      ),
    );

  const recentUsers = [...users]
    .sort(
      (a, b) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    )
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="company-dashboard">

        {/* =====================================================
            WELCOME HERO
           ===================================================== */}

        <div className="company-dashboard-hero">
          <div className="company-dashboard-hero-content">
            <p className="company-dashboard-eyebrow">
              Pakistan user management
              overview
            </p>

            <h1>
              Welcome back,{" "}
              {user?.name || "Admin"}
            </h1>

            <p className="company-dashboard-description">
              Monitor access, controls,
              and team operations with a
              secure and efficient
              administration dashboard.
            </p>
          </div>

          <div className="company-dashboard-user-summary">
            <div className="company-dashboard-avatars">
              {recentUsers.length > 0 ? (
                recentUsers.map(
                  (
                    recentUser,
                    index,
                  ) => (
                    <div
                      key={
                        recentUser.id
                      }
                      className="company-dashboard-mini-avatar"
                      style={{
                        zIndex:
                          recentUsers.length -
                          index,
                      }}
                    >
                      {recentUser.name
                        ?.charAt(0)
                        ?.toUpperCase() ||
                        "U"}
                    </div>
                  ),
                )
              ) : (
                <div className="company-dashboard-mini-avatar">
                  U
                </div>
              )}
            </div>

            <div>
              <p className="company-dashboard-user-label">
                Active users
              </p>

              <span className="company-dashboard-user-count">
                {activeUsers}
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================
            STAT CARDS
           ===================================================== */}

        <div className="company-dashboard-stats">
          <StatCard
            icon="♟"
            label="Total Users"
            value={totalUsers}
            iconClass="company-stat-primary"
          />

          <StatCard
            icon="◆"
            label="Roles"
            value={totalRoles}
            iconClass="company-stat-secondary"
          />

          <StatCard
            icon="▣"
            label="Groups"
            value={totalGroups}
            iconClass="company-stat-accent"
          />

          <StatCard
            icon="✓"
            label="Permissions"
            value={
              permissionNames.length
            }
            iconClass="company-stat-dark"
          />
        </div>

        {/* =====================================================
            MAIN CONTENT
           ===================================================== */}

        <div className="company-dashboard-main-grid">

          {/* Recent activity / users */}

          <div className="company-dashboard-panel company-dashboard-panel-large">
            <div className="company-dashboard-panel-header">
              <h2>
                Recent users
              </h2>

              <span className="company-dashboard-chart-icon">
                ↗
              </span>
            </div>

            <div className="company-dashboard-activity">
              {recentUsers.length > 0 ? (
                recentUsers.map(
                  (
                    recentUser,
                    index,
                  ) => (
                    <RecentUser
                      key={
                        recentUser.id
                      }
                      user={
                        recentUser
                      }
                      index={
                        index
                      }
                    />
                  ),
                )
              ) : (
                <p className="company-dashboard-empty">
                  No users available.
                </p>
              )}
            </div>
          </div>

          {/* Quick stats */}

          <div className="company-dashboard-panel">
            <h2>
              Quick stats
            </h2>

            <div className="company-dashboard-quick-stats">

              <div className="company-quick-stat">
                <div className="company-quick-stat-left">
                  <span className="company-quick-icon company-quick-secondary">
                    +
                  </span>

                  <span>
                    Total users
                  </span>
                </div>

                <strong>
                  {totalUsers}
                </strong>
              </div>

              <div className="company-quick-stat">
                <div className="company-quick-stat-left">
                  <span className="company-quick-icon company-quick-primary">
                    ✓
                  </span>

                  <span>
                    Active users
                  </span>
                </div>

                <strong>
                  {activeUsers}
                </strong>
              </div>

              <div className="company-quick-stat">
                <div className="company-quick-stat-left">
                  <span className="company-quick-icon company-quick-accent">
                    ◆
                  </span>

                  <span>
                    Active roles
                  </span>
                </div>

                <strong>
                  {activeRoles}
                </strong>
              </div>

            </div>

            <div className="company-dashboard-summary">

              <div>
                <span>
                  Total permissions
                </span>

                <strong>
                  {
                    permissionNames.length
                  }
                </strong>
              </div>

              <div>
                <span>
                  Total roles
                </span>

                <strong>
                  {totalRoles}
                </strong>
              </div>

              <div>
                <span>
                  Total groups
                </span>

                <strong>
                  {totalGroups}
                </strong>
              </div>

              <div>
                <span>
                  Active groups
                </span>

                <strong>
                  {activeGroups}
                </strong>
              </div>

            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}