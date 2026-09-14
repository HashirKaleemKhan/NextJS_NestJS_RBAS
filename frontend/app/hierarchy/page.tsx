"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";

type HierarchyNode = {
  id: number;
  name: string;
  email: string;

  active: boolean;

  role: {
    id: number;
    name: string;
    isAdmin: boolean;
    group?: {
      id: number;
      name: string;
    } | null;
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


/* =========================================================
   HIERARCHY WIDTH CALCULATION

   IMPORTANT:
   This is the mechanism that prevents separate hierarchy
   trees from overlapping each other.

   DO NOT REMOVE.
   ========================================================= */

function getHierarchyWidth(
  node: HierarchyNode,
): number {
  const cardWidth = 280;
  const childGap = 24;

  if (
    !node.children ||
    node.children.length === 0
  ) {
    return cardWidth;
  }

  const childrenWidth =
    node.children.reduce(
      (total, child) =>
        total + getHierarchyWidth(child),
      0,
    ) +
    childGap *
      (node.children.length - 1);

  return Math.max(
    cardWidth,
    childrenWidth,
  );
}


/* =========================================================
   HIERARCHY COUNTS
   ========================================================= */

function countHierarchyUsers(
  nodes: HierarchyNode[],
): number {
  return nodes.reduce(
    (total, node) =>
      total +
      1 +
      countHierarchyUsers(
        node.children || [],
      ),
    0,
  );
}

function countHierarchyManagers(
  nodes: HierarchyNode[],
): number {
  return nodes.reduce(
    (total, node) =>
      total +
      (node.children?.length > 0
        ? 1
        : 0) +
      countHierarchyManagers(
        node.children || [],
      ),
    0,
  );
}

function getHierarchyDepth(
  nodes: HierarchyNode[],
): number {
  if (!nodes.length) {
    return 0;
  }

  return (
    1 +
    Math.max(
      ...nodes.map((node) =>
        getHierarchyDepth(
          node.children || [],
        ),
      ),
    )
  );
}


/* =========================================================
   USER CARD

   The map structure is unchanged.

   The hover details are positioned absolutely so they do
   NOT affect the hierarchy width or connector positions.
   ========================================================= */

function UserCard({
  node,
}: {
  node: HierarchyNode;
}) {
  return (
    <div
      className={`company-hierarchy-user-wrapper ${
        node.isCurrentUser
          ? "company-hierarchy-current-user-wrapper"
          : ""
      }`}
    >
      <div
        className={`company-hierarchy-user-card ${
          node.isCurrentUser
            ? "company-hierarchy-current-user"
            : ""
        }`}
      >
        <div className="company-hierarchy-user-main">
          <div className="company-hierarchy-avatar">
            {node.name.charAt(0).toUpperCase()}
          </div>

          <div className="company-hierarchy-user-info">
            <div className="company-hierarchy-name">
              {node.name}
            </div>

            <div className="company-hierarchy-email">
              {node.email}
            </div>

            <div className="company-hierarchy-role">
              {node.role.name}
            </div>
          </div>
        </div>

        {node.isCurrentUser && (
          <div className="company-hierarchy-you">
            <span className="company-hierarchy-you-dot" />
            You are here
          </div>
        )}
      </div>

      {/* =================================================
          HOVER USER INFORMATION
          ================================================= */}

      <div className="company-hierarchy-hover-card">

        <div className="company-hierarchy-hover-title">
          User Information
        </div>

        <div className="company-hierarchy-hover-header">
          <div className="company-hierarchy-hover-avatar">
            {node.name.charAt(0).toUpperCase()}
          </div>

          <div className="company-hierarchy-hover-heading">
            <strong>{node.name}</strong>

            <span>
              {node.role.name}
            </span>
          </div>
        </div>

        <div className="company-hierarchy-hover-details">

          {/* Full Name */}
          <div className="company-hierarchy-hover-detail">
            <span className="company-hierarchy-hover-label">
              Full Name
            </span>

            <strong>
              {node.name}
            </strong>
          </div>

          {/* Email Address */}
          <div className="company-hierarchy-hover-detail">
            <span className="company-hierarchy-hover-label">
              Email Address
            </span>

            <strong>
              {node.email}
            </strong>
          </div>

          {/* Role */}
          <div className="company-hierarchy-hover-detail">
            <span className="company-hierarchy-hover-label">
              Role
            </span>

            <strong>
              {node.role.name}
            </strong>
          </div>

          {/* Group */}
          <div className="company-hierarchy-hover-detail">
            <span className="company-hierarchy-hover-label">
              Group
            </span>

            <strong>
              {node.role.group?.name || "No group assigned"}
            </strong>
          </div>

          {/* Status */}
          <div className="company-hierarchy-hover-detail">
            <span className="company-hierarchy-hover-label">
              Status
            </span>

            <strong
              className={
                node.active
                  ? "company-hierarchy-hover-status-active"
                  : "company-hierarchy-hover-status-inactive"
              }
            >
              <span
                className="company-hierarchy-hover-status-dot"
              />

              {node.active
                ? "Active"
                : "Inactive"}
            </strong>
          </div>

          {/* Direct Reports */}
          <div className="company-hierarchy-hover-detail">
            <span className="company-hierarchy-hover-label">
              Direct Reports
            </span>

            <strong>
              {node.children?.length || 0}
            </strong>
          </div>

        </div>

        {node.isCurrentUser && (
          <div className="company-hierarchy-hover-current">
            <span className="company-hierarchy-hover-current-dot" />
            This is your account
          </div>
        )}

      </div>
    </div>
  );
} 


/* =========================================================
   HIERARCHY BRANCH

   KEEP THIS STRUCTURE.

   The calculated width is what keeps large subtrees from
   overlapping neighbouring root hierarchies.
   ========================================================= */

function HierarchyBranch({
  node,
}: {
  node: HierarchyNode;
}) {
  const subtreeWidth =
    getHierarchyWidth(node);

  return (
    <div
      className="company-hierarchy-branch"
      style={{
        width: `${subtreeWidth}px`,
        minWidth: `${subtreeWidth}px`,
      }}
    >

      <UserCard node={node} />

      {node.children.length > 0 && (
        <div className="company-hierarchy-children">

          {node.children.map((child) => (
            <HierarchyBranch
              key={child.id}
              node={child}
            />
          ))}

        </div>
      )}

    </div>
  );
}


/* =========================================================
   ADMIN HIERARCHY

   Handles BOTH types of company roots:

   1. Standalone non-admin roots

      CEO
      └── Sales Manager
          └── Sales Trainee

   2. Non-admin users under an administrator

      Admin
      ├── Manager A
      ├── Manager B
      └── Manager C

   Both are displayed.
   ========================================================= */

function AdminHierarchy({
  hierarchy,
}: {
  hierarchy: HierarchyNode[];
}) {

  /* -------------------------------------------------------
     Administrators
     ------------------------------------------------------- */

  const admins = hierarchy.filter(
    (node) => node.role.isAdmin,
  );


  /* -------------------------------------------------------
     Standalone company roots

     Example:
       CEO Sir
       └── Sales Manager
     ------------------------------------------------------- */

  const standaloneCompanyRoots =
    hierarchy.filter(
      (node) => !node.role.isAdmin,
    );


  /* -------------------------------------------------------
     Company roots belonging to administrators

     Example:
       Hashir Khan
       ├── Manager A
       ├── Manager B
       └── Manager C
     ------------------------------------------------------- */

  const adminCompanyRoots =
    admins.flatMap(
      (admin) =>
        admin.children || [],
    );


  /* -------------------------------------------------------
     Combine both types of company roots
     ------------------------------------------------------- */

  const companyRoots = [
    ...standaloneCompanyRoots,
    ...adminCompanyRoots,
  ];


  return (
    <div className="company-admin-hierarchy">


      {/* ===================================================
          ADMINISTRATORS
          =================================================== */}

      {admins.length > 0 && (
        <div className="company-hierarchy-level">

          <div className="company-hierarchy-section-heading">

            <div>

              <div className="company-panel-eyebrow">
                TOP LEVEL
              </div>

              <h3>
                Administrators
              </h3>

              <p>
                System administrators with access
                across the organization.
              </p>

            </div>


            <div className="company-hierarchy-level-count">
              {admins.length}
            </div>

          </div>


          <div className="company-admin-row">

            {admins.map((admin) => (
              <UserCard
                key={admin.id}
                node={admin}
              />
            ))}

          </div>

        </div>
      )}


      {/* ===================================================
          COMPANY HIERARCHIES
          =================================================== */}

      {companyRoots.length > 0 && (
        <div className="company-hierarchy-company">

          <div className="company-hierarchy-connector" />


          <div className="company-hierarchy-section-heading">

            <div>

              <div className="company-panel-eyebrow">
                ORGANIZATION
              </div>

              <h3>
                Company hierarchy
              </h3>

              <p>
                Managers and reporting relationships
                across the organization.
              </p>

            </div>

          </div>


          {/* =================================================
              ROOT HIERARCHIES

              Every root is rendered independently.

              Example:

              CEO                    Manager A
               │                         │
          Sales Manager          Supervisor A
               │                  Supervisor B
          Sales Trainee           Supervisor D

              The subtree width calculation ensures these
              structures cannot overlap.
              ================================================= */}

          <div className="company-hierarchy-tree">

            {companyRoots.map((node) => (
              <HierarchyBranch
                key={node.id}
                node={node}
              />
            ))}

          </div>

        </div>
      )}


      {/* ===================================================
          EMPTY STATE
          =================================================== */}

      {admins.length === 0 &&
        companyRoots.length === 0 && (

          <div className="company-hierarchy-empty">

            <div className="company-hierarchy-empty-icon">
              ⌘
            </div>

            <strong>
              No company hierarchy configured
            </strong>

            <span>
              There are currently no reporting
              relationships available in the
              organization.
            </span>

          </div>

        )}

    </div>
  );
}


/* =========================================================
   MAIN HIERARCHY PAGE
   ========================================================= */

export default function HierarchyPage() {

  const router = useRouter();


  /* =======================================================
     DATA
     ======================================================= */

  const [data, setData] =
    useState<HierarchyResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  /* =======================================================
     ZOOM
     =======================================================

     This only scales the map.

     It does not change:
     - hierarchy relationships
     - branch calculation
     - connectors
     - subtree widths
     - root positioning
     ======================================================= */

  const [zoom, setZoom] =
    useState(1);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 1.5;
  const ZOOM_STEP = 0.1;


  function zoomIn() {
    setZoom((current) =>
      Math.min(
        MAX_ZOOM,
        Number(
          (
            current +
            ZOOM_STEP
          ).toFixed(2),
        ),
      ),
    );
  }


  function zoomOut() {
    setZoom((current) =>
      Math.max(
        MIN_ZOOM,
        Number(
          (
            current -
            ZOOM_STEP
          ).toFixed(2),
        ),
      ),
    );
  }


  function resetZoom() {
    setZoom(1);
  }


  /* =======================================================
     LOAD HIERARCHY
     ======================================================= */

  useEffect(() => {

    async function loadHierarchy() {

      try {

        setError("");

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
          err?.response?.data
            ?.message ||
            "Unable to load hierarchy.",
        );

      } finally {

        setLoading(false);

      }
    }

    loadHierarchy();

  }, []);


  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {

    return (
      <DashboardLayout>

        <div className="company-page-loading">

          <div className="company-loading-spinner" />

          <span>
            Loading hierarchy...
          </span>

        </div>

      </DashboardLayout>
    );
  }


  /* =======================================================
     CALCULATED STATISTICS
     ======================================================= */

  const hierarchy =
    data?.hierarchy || [];

  const totalUsers =
    countHierarchyUsers(
      hierarchy,
    );

  const totalManagers =
    countHierarchyManagers(
      hierarchy,
    );

  const hierarchyDepth =
    getHierarchyDepth(
      hierarchy,
    );


  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <DashboardLayout>

      <div className="company-hierarchy-page">


        {/* =================================================
            PAGE HEADER
            ================================================= */}

        <div className="company-page-header">

          <div>

            <div className="company-page-eyebrow">
              ORGANIZATION
            </div>

            <h1>
              Your Hierarchy
            </h1>

            <p>
              View the reporting structure of the
              organization and see where you are
              positioned within it.
            </p>

          </div>


          <div className="company-page-actions">

            <button
              type="button"
              className="company-secondary-button"
              onClick={() =>
                router.push(
                  "/dashboard",
                )
              }
            >
              ← Back to Dashboard
            </button>

          </div>

        </div>


        {/* =================================================
            ERROR
            ================================================= */}

        {error && (
          <div className="company-users-error">
            {error}
          </div>
        )}


        {!error && data && (
          <>


            {/* =============================================
                STATISTICS
                ============================================= */}

            <div className="company-user-stats">


              <div className="company-user-stat-card">

                <div className="company-user-stat-icon company-user-stat-icon-blue">
                  ◉
                </div>

                <div className="company-user-stat-content">

                  <span>
                    People in view
                  </span>

                  <strong>
                    {totalUsers}
                  </strong>

                  <small>
                    Users visible in your hierarchy
                  </small>

                </div>

              </div>


              <div className="company-user-stat-card">

                <div className="company-user-stat-icon company-user-stat-icon-green">
                  ⌘
                </div>

                <div className="company-user-stat-content">

                  <span>
                    Reporting managers
                  </span>

                  <strong>
                    {totalManagers}
                  </strong>

                  <small>
                    Managers with direct reports
                  </small>

                </div>

              </div>


              <div className="company-user-stat-card">

                <div className="company-user-stat-icon company-user-stat-icon-gold">
                  ◆
                </div>

                <div className="company-user-stat-content">

                  <span>
                    Hierarchy levels
                  </span>

                  <strong>
                    {hierarchyDepth}
                  </strong>

                  <small>
                    Levels represented in this view
                  </small>

                </div>

              </div>

            </div>


            {/* =============================================
                HIERARCHY PANEL
                ============================================= */}

            <div className="company-hierarchy-panel">


              {/* ===========================================
                  PANEL HEADER
                  =========================================== */}

              <div className="company-hierarchy-panel-header">

                <div>

                  <div className="company-panel-eyebrow">
                    ORGANIZATION STRUCTURE
                  </div>

                  <h2>
                    {data.isAdmin
                      ? "Company hierarchy"
                      : "Your reporting structure"}
                  </h2>

                  <p>
                    {data.isAdmin
                      ? "A complete view of administrators and the company reporting structure."
                      : "A view of your position and the people connected below you."}
                  </p>

                </div>


                {/* =========================================
                    TOOLS
                    ========================================= */}

                <div className="company-hierarchy-tools">


                  {/* =======================================
                      ZOOM
                      ======================================= */}

                  <div className="company-hierarchy-zoom">

                    <button
                      type="button"
                      className="company-hierarchy-zoom-button"
                      onClick={zoomOut}
                      disabled={
                        zoom <= MIN_ZOOM
                      }
                      aria-label="Zoom out"
                      title="Zoom out"
                    >
                      −
                    </button>


                    <button
                      type="button"
                      className="company-hierarchy-zoom-value"
                      onClick={resetZoom}
                      title="Reset zoom"
                    >
                      {Math.round(
                        zoom * 100,
                      )}
                      %
                    </button>


                    <button
                      type="button"
                      className="company-hierarchy-zoom-button"
                      onClick={zoomIn}
                      disabled={
                        zoom >= MAX_ZOOM
                      }
                      aria-label="Zoom in"
                      title="Zoom in"
                    >
                      +
                    </button>

                  </div>


                  {/* =======================================
                      LEGEND
                      ======================================= */}

                  <div className="company-hierarchy-legend">

                    <span className="company-hierarchy-legend-dot" />

                    <span>
                      You are here
                    </span>

                  </div>

                </div>

              </div>


              {/* ===========================================
                  MAP BODY
                  =========================================== */}

              <div className="company-hierarchy-panel-body">

                <div className="company-hierarchy-zoom-viewport">

                  <div
                    className="company-hierarchy-zoom-canvas"
                    style={{
                      transform: `scale(${zoom})`,
                    }}
                  >

                    {data.isAdmin ? (

                      <AdminHierarchy
                        hierarchy={
                          hierarchy
                        }
                      />

                    ) : hierarchy.length > 0 ? (

                      <div className="company-hierarchy-tree-scroll">

                        <div className="company-hierarchy-tree">

                          {hierarchy.map(
                            (node) => (
                              <HierarchyBranch
                                key={node.id}
                                node={node}
                              />
                            ),
                          )}

                        </div>

                      </div>

                    ) : (

                      <div className="company-hierarchy-empty">

                        <div className="company-hierarchy-empty-icon">
                          ⌘
                        </div>

                        <strong>
                          No hierarchy available
                        </strong>

                        <span>
                          There are currently
                          no reporting
                          relationships
                          available for your
                          account.
                        </span>

                      </div>

                    )}

                  </div>

                </div>

              </div>


              {/* ===========================================
                  FOOTER
                  =========================================== */}

              <div className="company-hierarchy-panel-footer">

                <span>
                  {data.isAdmin
                    ? "Administrator view"
                    : "Scoped organizational view"}
                </span>

                <span className="company-hierarchy-footer-separator">
                  •
                </span>

                <span>
                  {totalUsers}{" "}
                  {totalUsers === 1
                    ? "person"
                    : "people"}{" "}
                  in view
                </span>

                <span className="company-hierarchy-footer-separator">
                  •
                </span>

                <span>
                  Zoom{" "}
                  {Math.round(
                    zoom * 100,
                  )}
                  %
                </span>

              </div>

            </div>

          </>
        )}

      </div>

    </DashboardLayout>
  );
}