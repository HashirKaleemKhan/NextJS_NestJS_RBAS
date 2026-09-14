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

type UserRole = {
  id?: number;
  name: string;
  level?: number;
  active: boolean;
  isAdmin?: boolean;
  groupId?: number | null;
  group?: Group | null;
};

type User = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;

  role?: UserRole;

  manager?: {
    id: number;
    name: string;
  } | null;
};

type CurrentUser = {
  id: number;
  name: string;
  role?: string;
  permissions?: string[];
};

export default function ViewUserPage() {
  const params = useParams();
  const router = useRouter();

  const userId = params.id;

  const [user, setUser] =
    useState<User | null>(null);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [notFound, setNotFound] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setCurrentUser(
      getUser() as CurrentUser | null,
    );

    async function loadUser() {
      try {
        const userResponse =
          await api.get<User>(
            `/users/${userId}`,
          );

        setUser(userResponse.data);
      } catch (err: any) {
        if (
          err?.response?.status === 401
        ) {
          router.replace("/login");
          return;
        }

        if (
          err?.response?.status === 404
        ) {
          setNotFound(true);
          return;
        }

        setError(
          err?.response?.data?.message ||
            "Unable to load user",
        );
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadUser();
    }
  }, [router, userId]);

  // -----------------------------------
  // ROLE
  // -----------------------------------

  const roleName =
    user?.role?.name ||
    "Unassigned";

  // -----------------------------------
  // GROUP
  // -----------------------------------

  const groupName =
    user?.role?.isAdmin
      ? "System Administration"
      : user?.role?.group?.name ||
        "Unassigned";

  // -----------------------------------
  // STATUS
  // -----------------------------------

  const isActive =
    user?.active === true;

  // -----------------------------------
  // PERMISSIONS
  // -----------------------------------

  const canUpdateUsers =
    currentUser?.permissions?.includes(
      "users.update",
    ) || false;

  const isProtectedAdmin =
    currentUser?.role === "Admin" &&
    roleName === "Admin";

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="company-page-loading">
          <div className="company-loading-spinner" />

          <span>
            Loading user...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // NOT FOUND
  // -----------------------------------

  if (notFound || !user) {
    return (
      <DashboardLayout>
        <div className="company-users-page">
          <div className="company-page-header">
            <div>
              <div className="company-page-eyebrow">
                USER MANAGEMENT
              </div>

              <h1>
                View User
              </h1>

              <p>
                User not found.
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
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="company-user-view-panel">
            <p className="company-users-empty-text">
              User not found.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // ERROR
  // -----------------------------------

  if (error) {
    return (
      <DashboardLayout>
        <div className="company-users-page">
          <div className="company-users-error">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <DashboardLayout>
      <div className="company-users-page">

        {/* PAGE HEADER */}

        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              USER MANAGEMENT
            </div>

            <h1>
              View User
            </h1>

            <p>
              {user.name}
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
            >
              ← Back
            </button>

            {canUpdateUsers &&
              !isProtectedAdmin && (
                <button
                  type="button"
                  className="company-primary-button"
                  onClick={() =>
                    router.push(
                      `/users/${user.id}/edit`,
                    )
                  }
                >
                  ✎ Edit User
                </button>
              )}

          </div>
        </div>

        {/* USER PROFILE */}

        <div className="company-user-view-panel">

          <div className="company-user-profile">

            <div className="company-user-profile-avatar">
              {user.name
                ?.charAt(0)
                .toUpperCase() ||
                "U"}
            </div>

            <div className="company-user-profile-info">

              <div className="company-user-profile-name">
                {user.name}
              </div>

              <div className="company-user-profile-email">
                {user.email}
              </div>

            </div>

          </div>

          {/* USER INFORMATION */}

          <div className="company-user-information">

            <h3>
              User Information
            </h3>

            <div className="company-user-information-grid">

              {/* FULL NAME */}

              <div className="company-user-information-item">
                <span>
                  Full Name
                </span>

                <strong>
                  {user.name}
                </strong>
              </div>

              {/* EMAIL */}

              <div className="company-user-information-item">
                <span>
                  Email Address
                </span>

                <strong>
                  {user.email}
                </strong>
              </div>

              {/* ROLE */}

              <div className="company-user-information-item">
                <span>
                  Role
                </span>

                <strong>
                  <span className="company-role-badge company-role-badge-blue">
                    {roleName}
                  </span>
                </strong>
              </div>

              {/* GROUP */}

              <div className="company-user-information-item">
                <span>
                  Group
                </span>

                <strong>
                  <span className="company-role-badge company-role-badge-green">
                    {groupName}
                  </span>
                </strong>
              </div>

            </div>

            {/* STATUS */}

            <div className="company-user-view-status">

              <span>
                Status
              </span>

              {isActive ? (
                <strong>
                  <span className="company-status-badge company-status-active">
                    <span className="company-status-dot" />

                    Active
                  </span>
                </strong>
              ) : (
                <strong>
                  <span className="company-status-badge company-status-inactive">
                    <span className="company-status-dot" />

                    Inactive
                  </span>
                </strong>
              )}

            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}