"use client";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

import { getUser } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

// -----------------------------------
// GRAPHQL
// -----------------------------------

const USER_QUERY = gql`
  query UserForView($id: Int!) {
    user(id: $id) {
      id
      name
      email
      active
      roleId
      managerId
      groupId
      createdAt
      updatedAt
     role {
        id
        name
        active
        group {
          id
          name
          active
        }
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

type UserRole = {
  id?: number;
  name: string;
  active?: boolean;
  isAdmin?: boolean;
  groupId?: number | null;
  group?: {
    id: number;
    name: string;
    active?: boolean;
  } | null;
};

type User = {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
  active: boolean;

  role?: UserRole | null;

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

type UserQueryData = {
  user: User | null;
};

type UserQueryVariables = {
  id: number;
};

// -----------------------------------
// PAGE
// -----------------------------------

export default function ViewUserPage() {
  const params = useParams();
  const router = useRouter();

  const userId = Number(params.id);

  // -----------------------------------
  // AUTH
  // -----------------------------------

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [authorized, setAuthorized] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  // -----------------------------------
  // STATE
  // -----------------------------------

  const [notFound, setNotFound] =
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

    const current =
      getUser() as CurrentUser | null;

    setCurrentUser(current);
    setAuthorized(true);
    setCheckingAuth(false);
  }, [router]);

  // -----------------------------------
  // LOAD USER
  // -----------------------------------

  const {
    data,
    loading,
    error: queryError,
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
  // HANDLE QUERY RESULT
  // -----------------------------------

  useEffect(() => {
    if (!authorized) {
      return;
    }

    if (queryError) {
      console.error(
        "Unable to load user:",
        queryError,
      );

      setError(
        queryError.message ||
          "Unable to load user",
      );

      return;
    }

    if (
      !loading &&
      data &&
      !data.user
    ) {
      setNotFound(true);
    }
  }, [
    authorized,
    data,
    loading,
    queryError,
  ]);

  // -----------------------------------
  // USER
  // -----------------------------------

  const user =
    data?.user || null;

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

  if (
    checkingAuth ||
    loading
  ) {
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
  // NOT FOUND
  // -----------------------------------

  if (
    notFound ||
    !user
  ) {
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