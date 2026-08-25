"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import {logout } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type HierarchyNode = {
  id: number;
  name: string;
  email: string;

  role: {
    id: number;
    name: string;
    isAdmin: boolean;
  };

  managerId: number | null;

  children: HierarchyNode[];

  isCurrentUser: boolean;
};

type HierarchyResponse = {
  currentUserId: number;
  isAdmin: boolean;
  hierarchy: HierarchyNode[];
};

function UserCard({
  node,
}: {
  node: HierarchyNode;
}) {
  return (
    <div
      className={`hierarchy-user-card ${
        node.isCurrentUser
          ? "hierarchy-current-user"
          : ""
      }`}
    >
      <div className="hierarchy-avatar">
        {node.name
          .charAt(0)
          .toUpperCase()}
      </div>

      <div className="hierarchy-user-info">
        <div className="hierarchy-name">
          {node.name}
        </div>

        <div className="hierarchy-role">
          {node.role.name}
        </div>
      </div>

      {node.isCurrentUser && (
        <div className="hierarchy-you">
          YOU ARE HERE
        </div>
      )}
    </div>
  );
}

/*
 * Recursively renders:
 *
 * Manager
 *   ├── Supervisor
 *   │     └── Developer
 *   └── Supervisor
 *         └── Developer
 */

function HierarchyBranch({
  node,
}: {
  node: HierarchyNode;
}) {
  return (
    <div className="hierarchy-branch">

      <UserCard node={node} />

      {node.children.length > 0 && (
        <div className="hierarchy-children">

          {node.children.map(
            (child) => (
              <HierarchyBranch
                key={child.id}
                node={child}
              />
            ),
          )}

        </div>
      )}
    </div>
  );
}

export default function HierarchyPage() {
  const router = useRouter();

  const [data, setData] =
    useState<HierarchyResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadHierarchy() {
      try {
        const response =
          await api.get(
            "/users/hierarchy",
          );

        setData(response.data);
      } catch (err: any) {
        console.error(
          "Unable to load hierarchy:",
          err,
        );

        setError(
          err?.response?.data?.message ||
            "Unable to load hierarchy.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadHierarchy();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-loading">
          Loading hierarchy...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>

      {/* PAGE HEADER */}

      <div className="page-header">

        <div>
          <div className="page-eyebrow">
            ORGANIZATION
          </div>

          <h1>Your Hierarchy</h1>

          <p>
            View the company structure and
            see where you are in the
            organization.
          </p>
        </div>

        <div className="page-header-actions">

          <button
            className="button button-secondary"
            onClick={() =>
              router.push("/dashboard")
            }
          >
            ← Back to Dashboard
          </button>
          <button
                      className="button button-secondary"
                      onClick={logout}
                    >
                      Logout
                    </button>

        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="alert-error">
          {error}
        </div>
      )}

      {/* HIERARCHY */}

      {!error && data && (
        <div className="hierarchy-card">

          {/* LEGEND */}

          <div className="hierarchy-legend">

            <span className="hierarchy-legend-dot" />

            <span>
              You are here
            </span>

          </div>

          {/* ADMIN VIEW */}

          {data.isAdmin ? (
            <AdminHierarchy
              hierarchy={data.hierarchy}
            />
          ) : (
            /*
             * Non-admin view
             */
            <div className="hierarchy-tree-scroll">

              <div className="hierarchy-tree">

                {data.hierarchy.map(
                  (node) => (
                    <HierarchyBranch
                      key={node.id}
                      node={node}
                    />
                  ),
                )}

              </div>

            </div>
          )}

        </div>
      )}

    </DashboardLayout>
  );
}

/*
 * ADMIN HIERARCHY
 *
 * All administrators appear together
 * at the top.
 *
 * Then the normal company hierarchy
 * begins underneath them.
 */

function AdminHierarchy({
  hierarchy,
}: {
  hierarchy: HierarchyNode[];
}) {
  /*
   * All administrators appear together
   * at the top.
   */
  const admins = hierarchy.filter(
    (node) => node.role.isAdmin,
  );

  /*
   * Managers and everyone below them
   * are children of the administrators.
   *
   * Flatten the children from ALL admins
   * so the company hierarchy continues
   * underneath the admin level.
   */
  const companyNodes = admins.flatMap(
    (admin) => admin.children,
  );

  return (
    <div className="admin-hierarchy">

      {/* =================================
          ADMINISTRATORS
          ================================= */}

      <div className="hierarchy-level">

        <div className="hierarchy-level-label">
          ADMINISTRATORS
        </div>

        <div className="admin-row">

          {admins.map((admin) => (
            <UserCard
              key={admin.id}
              node={admin}
            />
          ))}

        </div>

      </div>

      {/* =================================
          COMPANY HIERARCHY
          ================================= */}

      {companyNodes.length > 0 && (
        <div className="company-hierarchy">

          <div className="hierarchy-connector" />

          <div className="hierarchy-level-label">
            COMPANY
          </div>

          <div className="hierarchy-tree">

            {companyNodes.map((node) => (
              <HierarchyBranch
                key={node.id}
                node={node}
              />
            ))}

          </div>

        </div>
      )}

    </div>
  );
}