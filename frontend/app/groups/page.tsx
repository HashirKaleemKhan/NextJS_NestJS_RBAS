"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { gql } from "@apollo/client";
import {
  useMutation,
  useQuery,
} from "@apollo/client/react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import ConfirmModal from "@/components/ConfirmModal";

// -----------------------------------
// TYPES
// -----------------------------------

type Permission = {
  id: number;
  name: string;
  parentId: number | null;
};

type GroupPermission = {
  permission: Permission;
};

type GroupRole = {
  id: number;
  name?: string;
};

type Group = {
  id: number;
  name: string;
  active: boolean;
  permissions: GroupPermission[];
  roles: GroupRole[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type GroupsQueryData = {
  groups: {
    data: Group[];
    pagination: Pagination;
  };
};

type GroupsQueryVariables = {
  page?: number;
  limit?: number;
  search?: string;
};

type ToggleGroupStatusData = {
  toggleGroupStatus: Group;
};

type DeleteGroupData = {
  deleteGroup: string;
};

// -----------------------------------
// GRAPHQL
// -----------------------------------

const GROUPS_QUERY = gql`
  query Groups(
    $page: Int
    $limit: Int
    $search: String
  ) {
    groups(
      page: $page
      limit: $limit
      search: $search
    ) {
      data {
        id
        name
        active

        permissions {
          permission {
            id
            name
            parentId
          }
        }

        roles {
          id
          name
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

const TOGGLE_GROUP_STATUS_MUTATION = gql`
  mutation ToggleGroupStatus($id: Int!) {
    toggleGroupStatus(id: $id) {
      id
      name
      active
    }
  }
`;

const DELETE_GROUP_MUTATION = gql`
  mutation DeleteGroup($id: Int!) {
    deleteGroup(id: $id)
  }
`;

// -----------------------------------
// PAGE
// -----------------------------------

function GroupsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [groups, setGroups] =
    useState<Group[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [pageLoading, setPageLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<Group | null>(null);

  const [deleteLoading, setDeleteLoading] =
    useState(false);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

  const searchTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const success =
    searchParams.get("success");

  // -----------------------------------
  // GROUPS QUERY
  // -----------------------------------

  const {
    data,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery<
    GroupsQueryData,
    GroupsQueryVariables
  >(GROUPS_QUERY, {
    variables: {
      page: 1,
      limit: 10,
      search: "",
    },
    fetchPolicy: "network-only",
  });

  // -----------------------------------
  // MUTATIONS
  // -----------------------------------

  const [
    toggleGroupStatusMutation,
  ] = useMutation<
    ToggleGroupStatusData
  >(TOGGLE_GROUP_STATUS_MUTATION);

  const [
    deleteGroupMutation,
  ] = useMutation<DeleteGroupData>(
    DELETE_GROUP_MUTATION,
  );

  // -----------------------------------
  // CLEAN UP SEARCH TIMER
  // -----------------------------------

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  // -----------------------------------
  // INITIAL QUERY RESULT
  // -----------------------------------

  useEffect(() => {
    if (queryLoading) {
      return;
    }

    if (queryError) {
      if (
        queryError.message
          ?.toLowerCase()
          .includes("unauthorized") ||
        queryError.message
          ?.toLowerCase()
          .includes("jwt") ||
        queryError.message
          ?.toLowerCase()
          .includes("authentication")
      ) {
        router.replace("/login");
        return;
      }

      setError(
        queryError.message ||
          "Unable to load groups.",
      );

      setLoading(false);
      return;
    }

    if (data?.groups) {
      setGroups(
        Array.isArray(data.groups.data)
          ? data.groups.data
          : [],
      );

      setPagination(
        data.groups.pagination,
      );
    }

    setLoading(false);
  }, [
    data,
    queryError,
    queryLoading,
    router,
  ]);

  // -----------------------------------
  // TOKEN CHECK
  // -----------------------------------

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  // -----------------------------------
  // URL SUCCESS MESSAGE
  // -----------------------------------

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.replace("/groups");
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success, router]);

  // -----------------------------------
  // SUCCESS MESSAGE TEXT
  // -----------------------------------

  function getSuccessMessage() {
    switch (success) {
      case "created":
        return "Group created successfully.";

      case "updated":
        return "Group updated successfully.";

      case "deleted":
        return "Group deleted successfully.";

      case "activated":
        return "Group activated successfully.";

      case "deactivated":
        return "Group deactivated successfully.";

      default:
        return "";
    }
  }

  // -----------------------------------
  // LOAD GROUPS
  // -----------------------------------

  async function loadGroups(
    page: number,
    searchQuery = search,
  ) {
    try {
      setPageLoading(true);
      setError("");

      const result =
        await refetch({
          page,
          limit: 10,
          search:
            searchQuery.trim(),
        });

      if (result.data?.groups) {
        setGroups(
          Array.isArray(
            result.data.groups.data,
          )
            ? result.data.groups.data
            : [],
        );

        setPagination(
          result.data.groups.pagination,
        );
      }
    } catch (err: any) {
      const message =
        err?.message ||
        "Unable to load groups.";

      if (
        message
          .toLowerCase()
          .includes("unauthorized") ||
        message
          .toLowerCase()
          .includes("jwt") ||
        message
          .toLowerCase()
          .includes("authentication")
      ) {
        router.replace("/login");
        return;
      }

      setError(message);
    } finally {
      setPageLoading(false);
    }
  }

  // -----------------------------------
  // CHANGE PAGE
  // -----------------------------------

  async function changePage(
    nextPage: number,
  ) {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === pagination.page ||
      pageLoading
    ) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    await loadGroups(
      nextPage,
      search,
    );
  }

  // -----------------------------------
  // SEARCH
  // -----------------------------------

  function handleSearch(
    value: string,
  ) {
    setSearch(value);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current =
      setTimeout(() => {
        loadGroups(1, value);
      }, 300);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // -----------------------------------
  // DELETE GROUP
  // -----------------------------------

  function deleteGroup(
    group: Group,
  ) {
    setError("");
    setDeleteTarget(group);
  }

  // -----------------------------------
  // CONFIRM DELETE GROUP
  // -----------------------------------

  async function confirmDeleteGroup() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      await deleteGroupMutation({
        variables: {
          id: deleteTarget.id,
        },
      });

      setDeleteTarget(null);

      const currentPage =
        pagination.page;

      const currentTotal =
        pagination.total;

      const newTotal =
        Math.max(
          0,
          currentTotal - 1,
        );

      const newTotalPages =
        Math.ceil(
          newTotal /
            pagination.limit,
        );

      const nextPage =
        newTotalPages === 0
          ? 1
          : Math.min(
              currentPage,
              newTotalPages,
            );

      await loadGroups(
        nextPage,
        search,
      );

      router.replace(
        "/groups?success=deleted",
      );
    } catch (err: any) {
      const message =
        err?.message ||
        "Unable to delete group.";

      if (
        message
          .toLowerCase()
          .includes("unauthorized") ||
        message
          .toLowerCase()
          .includes("jwt") ||
        message
          .toLowerCase()
          .includes("authentication")
      ) {
        router.replace("/login");
        return;
      }

      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  // -----------------------------------
  // TOGGLE GROUP STATUS
  // -----------------------------------

  async function toggleGroup(
    group: Group,
  ) {
    try {
      setError("");

      const newActiveStatus =
        !group.active;

      const result =
        await toggleGroupStatusMutation({
          variables: {
            id: group.id,
          },
        });

      const updatedGroup =
        result.data?.toggleGroupStatus;

      if (updatedGroup) {
        setGroups(
          (currentGroups) =>
            currentGroups.map(
              (item) =>
                item.id === group.id
                  ? {
                      ...item,
                      active:
                        updatedGroup.active,
                    }
                  : item,
            ),
        );
      }

      router.replace(
        `/groups?success=${
          newActiveStatus
            ? "activated"
            : "deactivated"
        }`,
      );
    } catch (err: any) {
      const message =
        err?.message ||
        "Unable to update group status.";

      if (
        message
          .toLowerCase()
          .includes("unauthorized") ||
        message
          .toLowerCase()
          .includes("jwt") ||
        message
          .toLowerCase()
          .includes("authentication")
      ) {
        router.replace("/login");
        return;
      }

      setError(message);
    }
  }

  // -----------------------------------
  // COUNTS
  // -----------------------------------

  const totalGroups =
    pagination.total;

  const activeGroups =
    groups.filter(
      (group) => group.active,
    ).length;

  const inactiveGroups =
    groups.filter(
      (group) => !group.active,
    ).length;

  // -----------------------------------
  // CURRENT PAGE RANGE
  // -----------------------------------

  const currentPageStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) *
          pagination.limit +
        1;

  const currentPageEnd =
    Math.min(
      pagination.page *
        pagination.limit,
      pagination.total,
    );

  // -----------------------------------
  // SERVER-SIDE RESULTS
  // -----------------------------------

  const filteredGroups =
    groups;

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading || queryLoading) {
    return (
      <DashboardLayout>
        <div className="company-page-loading">
          <div className="company-loading-spinner" />

          <span>
            Loading groups...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <DashboardLayout>
      <div className="company-groups-page">

        {/* PAGE HEADER */}

        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              GROUP MANAGEMENT
            </div>

            <h1>
              Groups
            </h1>

            <p>
              Manage application groups and
              their permissions.
            </p>
          </div>

          <div className="company-page-actions">
            <button
              type="button"
              className="company-primary-button"
              onClick={() =>
                router.push(
                  "/groups/create",
                )
              }
            >
              <span className="company-button-plus">
                +
              </span>

              Add Group
            </button>
          </div>
        </div>

        {/* SUCCESS */}

        {success &&
          getSuccessMessage() && (
            <div className="company-users-success">
              ✓ {getSuccessMessage()}
            </div>
          )}

        {/* ERROR */}

        {error && (
          <div className="company-users-error">
            {Array.isArray(error)
              ? error.join(", ")
              : error}
          </div>
        )}

        {/* GROUP STATISTICS */}

        <div className="company-user-stats">

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-blue">
              ◉
            </div>

            <div className="company-user-stat-content">
              <span>
                Total groups
              </span>

              <strong>
                {totalGroups}
              </strong>

              <small>
                Groups configured in the system
              </small>
            </div>
          </div>

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-green">
              ✓
            </div>

            <div className="company-user-stat-content">
              <span>
                Active groups
              </span>

              <strong>
                {activeGroups}
              </strong>

              <small>
                Currently available groups
              </small>
            </div>
          </div>

          <div className="company-user-stat-card">
            <div className="company-user-stat-icon company-user-stat-icon-gold">
              ○
            </div>

            <div className="company-user-stat-content">
              <span>
                Inactive groups
              </span>

              <strong>
                {inactiveGroups}
              </strong>

              <small>
                Currently disabled groups
              </small>
            </div>
          </div>

        </div>

        {/* GROUPS PANEL */}

        <div className="company-users-panel">

          {/* PANEL HEADER */}

          <div className="company-users-panel-header">
            <div>
              <div className="company-panel-eyebrow">
                CONFIGURATION
              </div>

              <h2>
                All groups
              </h2>

              <p>
                {pagination.total}{" "}
                {pagination.total === 1
                  ? "group"
                  : "groups"}{" "}
                found
              </p>
            </div>

            <div className="company-users-search">
              <span className="company-users-search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search groups..."
                value={search}
                onChange={(event) =>
                  handleSearch(
                    event.target.value,
                  )
                }
              />

              {search && (
                <button
                  type="button"
                  className="company-users-search-clear"
                  onClick={() =>
                    handleSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* PAGE LOADING */}

          {pageLoading ? (
            <div className="company-page-loading">
              <div className="company-loading-spinner" />

              <span>
                Loading groups...
              </span>
            </div>
          ) : filteredGroups.length ===
            0 ? (

            /* EMPTY */

            <div className="company-users-empty">

              <div className="company-users-empty-icon">
                ◉
              </div>

              <h3>
                No groups found
              </h3>

              <p>
                {search
                  ? "Try changing your search."
                  : "Create your first group to get started."}
              </p>

              {!search && (
                <button
                  type="button"
                  className="company-primary-button"
                  onClick={() =>
                    router.push(
                      "/groups/create",
                    )
                  }
                >
                  <span className="company-button-plus">
                    +
                  </span>

                  Add Group
                </button>
              )}

            </div>
          ) : (

            /* TABLE */

            <div className="company-users-table-wrapper">
              <table className="company-users-table">

                <thead>
                  <tr>
                    <th>
                      GROUP
                    </th>

                    <th>
                      PERMISSIONS
                    </th>

                    <th>
                      ROLES
                    </th>

                    <th>
                      STATUS
                    </th>

                    <th className="company-actions-heading">
                      ACTIONS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredGroups.map(
                    (group) => (
                      <tr
                        key={
                          group.id
                        }
                      >

                        {/* GROUP */}

                        <td>
                          <div className="company-user-cell">

                            <div className="company-user-avatar">
                              {group.name
                                ?.charAt(0)
                                .toUpperCase() ||
                                "G"}
                            </div>

                            <div className="company-user-details">
                              <div className="company-user-name">
                                {group.name}
                              </div>

                              <div className="company-user-id">
                                ID #{group.id}
                              </div>
                            </div>

                          </div>
                        </td>

                        {/* PERMISSIONS */}

                        <td>
                          {group.permissions?.length ? (
                            <div className="company-group-permissions">
                              {group.permissions.map(
                                ({
                                  permission,
                                }) => (
                                  <span
                                    key={
                                      permission.id
                                    }
                                    className="company-group-permission-chip"
                                  >
                                    {permission.name
                                      .split(".")[0]
                                      .replace(
                                        /^./,
                                        (char) =>
                                          char.toUpperCase(),
                                      )}
                                  </span>
                                ),
                              )}
                            </div>
                          ) : (
                            <span className="company-group-no-permissions">
                              No permissions
                            </span>
                          )}
                        </td>

                        {/* ROLES */}

                        <td>
                          <span className="company-role-badge company-role-badge-blue">
                            {group.roles?.length ||
                              0}{" "}
                            {group.roles?.length ===
                            1
                              ? "role"
                              : "roles"}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td>
                          {group.active ? (
                            <span className="company-status-badge company-status-active">
                              <span className="company-status-dot" />

                              <span>
                                Active
                              </span>
                            </span>
                          ) : (
                            <span className="company-status-badge company-status-inactive">
                              <span className="company-status-dot" />

                              <span>
                                Inactive
                              </span>
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="company-user-actions">

                            <button
                              type="button"
                              className="company-icon-button company-icon-view"
                              onClick={() =>
                                router.push(
                                  `/groups/${group.id}`,
                                )
                              }
                              title="View"
                              aria-label={`View ${group.name}`}
                            >
                              ◉
                            </button>

                            <button
                              type="button"
                              className="company-icon-button company-icon-edit"
                              onClick={() =>
                                router.push(
                                  `/groups/${group.id}/edit`,
                                )
                              }
                              title="Edit"
                              aria-label={`Edit ${group.name}`}
                            >
                              ✎
                            </button>

                            <button
                              type="button"
                              className={`company-icon-button ${
                                group.active
                                  ? "company-icon-status"
                                  : "company-icon-status-inactive"
                              }`}
                              onClick={() =>
                                toggleGroup(
                                  group,
                                )
                              }
                              title={
                                group.active
                                  ? "Deactivate"
                                  : "Activate"
                              }
                              aria-label={
                                group.active
                                  ? `Deactivate ${group.name}`
                                  : `Activate ${group.name}`
                              }
                            >
                              {group.active
                                ? "●"
                                : "○"}
                            </button>

                            <button
                              type="button"
                              className="company-icon-button company-icon-delete"
                              onClick={() =>
                                deleteGroup(
                                  group,
                                )
                              }
                              title="Delete"
                              aria-label={`Delete ${group.name}`}
                            >
                              ×
                            </button>

                          </div>
                        </td>

                      </tr>
                    ),
                  )}
                </tbody>

              </table>
            </div>
          )}

          {/* PAGINATION */}

          {pagination.total > 0 && (
            <div className="company-logs-pagination">

              <div className="company-logs-pagination-info">
                Showing{" "}
                <strong>
                  {currentPageStart}
                </strong>{" "}
                –{" "}
                <strong>
                  {currentPageEnd}
                </strong>{" "}
                of{" "}
                <strong>
                  {pagination.total}
                </strong>{" "}
                groups
              </div>

              <div className="company-logs-pagination-controls">

                <button
                  type="button"
                  onClick={() =>
                    changePage(
                      pagination.page - 1,
                    )
                  }
                  disabled={
                    pagination.page <= 1 ||
                    pageLoading
                  }
                  aria-label="Previous page"
                >
                  ‹
                </button>

                <span>
                  Page{" "}
                  <strong>
                    {pagination.page}
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {pagination.totalPages}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    changePage(
                      pagination.page + 1,
                    )
                  }
                  disabled={
                    pagination.page >=
                      pagination.totalPages ||
                    pageLoading
                  }
                  aria-label="Next page"
                >
                  ›
                </button>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* DELETE GROUP CONFIRMATION */}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Group?"
        description={
          <>
            Are you sure you want to delete{" "}
            <strong>
              {deleteTarget?.name}
            </strong>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Delete Group"
        onConfirm={
          confirmDeleteGroup
        }
        onCancel={() => {
          if (!deleteLoading) {
            setDeleteTarget(null);
          }
        }}
        loading={deleteLoading}
      />
    </DashboardLayout>
  );
}

export default function GroupsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="company-page-loading">
            <div className="company-loading-spinner" />
            <span>Loading groups...</span>
          </div>
        </DashboardLayout>
      }
    >
      <GroupsPageContent />
    </Suspense>
  );
}