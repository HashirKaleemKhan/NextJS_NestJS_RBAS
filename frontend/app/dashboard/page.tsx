"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
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
  role?: {
    name: string;
    active: boolean;
  };
};

type Role = {
  id: number;
  name: string;
  level: number;
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

type UsersResponse = {
  data: User[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RolesResponse = {
  data: Role[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type GroupsResponse =
  | Group[]
  | {
      data: Group[];
    };

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

  useEffect(() => {
    const loadDashboard = async () => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const currentUser: any = getUser();

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

      try {
        // -----------------------------------
        // USERS
        // -----------------------------------

        if (
          permissions.includes(
            "users.read",
          )
        ) {
          const usersResponse =
            await api.get<UsersResponse>(
              "/users",
              {
                params: {
                  page: 1,
                  limit: 100,
                },
              },
            );

          const response =
            usersResponse.data;

          const userList =
            Array.isArray(response)
              ? response
              : Array.isArray(
                    response?.data,
                  )
                ? response.data
                : [];

          setUsers(userList);

          /*
           * Use backend total when available.
           * This keeps dashboard totals correct
           * even when the users endpoint is
           * paginated.
           */
          setTotalUsers(
            response?.pagination?.total ??
              userList.length,
          );
        }

        // -----------------------------------
        // ROLES
        // -----------------------------------

        if (
          permissions.includes(
            "roles.manage",
          )
        ) {
          const rolesResponse =
            await api.get<RolesResponse>(
              "/roles",
              {
                params: {
                  page: 1,
                  limit: 100,
                },
              },
            );

          const response =
            rolesResponse.data;

          const roleList =
            Array.isArray(response)
              ? response
              : Array.isArray(
                    response?.data,
                  )
                ? response.data
                : [];

          setRoles(roleList);

          /*
           * The Roles endpoint is now
           * server-side paginated.
           *
           * Requesting 100 roles gives the
           * dashboard enough data for its
           * current statistics while the
           * backend still provides the true
           * total count.
           */
          setTotalRoles(
            response?.pagination?.total ??
              roleList.length,
          );

          // -----------------------------------
          // GROUPS
          // -----------------------------------

          const groupsResponse =
            await api.get<GroupsResponse>(
              "/groups",
            );

          const groupsData =
            groupsResponse.data;

          const groupList =
            Array.isArray(groupsData)
              ? groupsData
              : Array.isArray(
                    groupsData?.data,
                  )
                ? groupsData.data
                : [];

          setGroups(groupList);

          setTotalGroups(
            groupList.length,
          );
        }
      } catch (error: any) {
        if (
          error?.response?.status ===
          401
        ) {
          router.replace("/login");
          return;
        }

        if (
          error?.response?.status ===
          403
        ) {
          router.replace(
            "/access-denied",
          );

          return;
        }

        console.error(
          "Dashboard loading failed:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

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
      (item) =>
        item.role?.active === true,
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
