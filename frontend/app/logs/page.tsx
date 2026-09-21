"use client";

import { useEffect, useRef, useState } from "react";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

import DashboardLayout from "@/components/layouts/DashboardLayout";

type AuditLog = {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  actorId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  description: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type AuditPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type AuditLogsQueryData = {
  auditLogs: {
    data: AuditLog[];
    pagination: AuditPagination;
  };
};

type AuditLogsQueryVariables = {
  page: number;
  limit: number;
  search?: string;
  action?: string;
  entity?: string;
};

type AuditFiltersQueryData = {
  auditLogFilters: {
    actions: string[];
    entities: string[];
  };
};

const AUDIT_LOGS_QUERY = gql`
  query AuditLogs(
    $page: Int
    $limit: Int
    $search: String
    $action: String
    $entity: String
  ) {
    auditLogs(
      page: $page
      limit: $limit
      search: $search
      action: $action
      entity: $entity
    ) {
      data {
        id
        action
        entity
        entityId
        actorId
        actorName
        actorEmail
        description
        oldValues
        newValues
        ipAddress
        userAgent
        createdAt
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

const AUDIT_LOG_FILTERS_QUERY = gql`
  query AuditLogFilters {
    auditLogFilters {
      actions
      entities
    }
  }
`;

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatAction(action: string) {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
}

function getActionClass(action: string) {
  if (
    action.includes("CREATED") ||
    action.includes("SUCCESS")
  ) {
    return "company-audit-badge company-audit-success";
  }

  if (
    action.includes("DELETED") ||
    action.includes("FAILED")
  ) {
    return "company-audit-badge company-audit-danger";
  }

  if (
    action.includes("STATUS") ||
    action.includes("CHANGED")
  ) {
    return "company-audit-badge company-audit-warning";
  }

  return "company-audit-badge company-audit-info";
}

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");

  const [page, setPage] = useState(1);

  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null);

    const searchInputRef =
  useRef<HTMLInputElement>(null);

const keepSearchFocusRef =
  useRef(false);

  /*
   * Wait until the user stops typing before
   * sending the search value to GraphQL.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);


  /*
   * Reset pagination when the actual search
   * value changes.
   */
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    data: filtersData,
    error: filtersError,
  } = useQuery<AuditFiltersQueryData>(
    AUDIT_LOG_FILTERS_QUERY,
    {
      fetchPolicy: "network-only",
    },
  );

  const {
    data,
    loading,
    error,
  } = useQuery<
    AuditLogsQueryData,
    AuditLogsQueryVariables
  >(AUDIT_LOGS_QUERY, {
    variables: {
      page,
      limit: 20,
      search:
        debouncedSearch || undefined,
      action: action || undefined,
      entity: entity || undefined,
    },
    fetchPolicy: "network-only",
  });

  const logs =
    data?.auditLogs?.data || [];

  const pagination =
    data?.auditLogs?.pagination || null;

  const filters =
    filtersData?.auditLogFilters || {
      actions: [],
      entities: [],
    };

  const displayError =
    error?.message ||
    filtersError?.message ||
    "";

  useEffect(() => {
    if (
      pagination &&
      page > pagination.totalPages &&
      pagination.totalPages > 0
    ) {
      setPage(pagination.totalPages);
    }
  }, [pagination, page]);

  useEffect(() => {
  if (
    loading ||
    !keepSearchFocusRef.current
  ) {
    return;
  }

  const frame = window.requestAnimationFrame(() => {
    searchInputRef.current?.focus();
  });

  return () => {
    window.cancelAnimationFrame(frame);
  };
}, [loading]);

  function changePage(
    nextPage: number,
  ) {
    if (
      loading ||
      !pagination
    ) {
      return;
    }

    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages
    ) {
      return;
    }

    if (nextPage === page) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setPage(nextPage);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setAction("");
    setEntity("");
    setPage(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const createdCount = logs.filter(
    (log) =>
      log.action.includes("CREATED"),
  ).length;

  const changedCount = logs.filter(
    (log) =>
      log.action.includes("CHANGED"),
  ).length;

  const deletedCount = logs.filter(
    (log) =>
      log.action.includes("DELETED"),
  ).length;

  /*
   * Keep the application shell visible while
   * changing pages after the first response.
   */
  if (loading && !pagination) {
    return (
      <DashboardLayout>
        <div className="company-page-loading">
          <div className="company-loading-spinner" />

          <span>
            Loading audit logs...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="company-logs-page">

        {/* -------------------------------- */}
        {/* PAGE HEADER */}
        {/* -------------------------------- */}

        <div className="company-page-header">
          <div>
            <div className="company-page-eyebrow">
              SECURITY & ACTIVITY
            </div>

            <h1>
              Audit Logs
            </h1>

            <p>
              Monitor important activity across your
              management system.
            </p>
          </div>

          <div className="company-page-actions">
            <div className="company-logs-header-total">
              <span>
                Total Events
              </span>

              <strong>
                {pagination?.total ?? 0}
              </strong>
            </div>
          </div>
        </div>

        {/* -------------------------------- */}
        {/* ERROR */}
        {/* -------------------------------- */}

        {displayError && (
          <div className="company-users-error">
            {displayError}
          </div>
        )}

        {/* -------------------------------- */}
        {/* STATISTICS */}
        {/* -------------------------------- */}

        <div className="stats-grid company-logs-stats">

          <div className="stat-card stat-card-total">
            <div className="stat-card-content">

              <span className="stat-card-label">
                Total
              </span>

              <strong className="stat-card-value">
                {pagination?.total ?? 0}
              </strong>

              <span className="stat-card-description">
                Recorded audit events
              </span>

            </div>
          </div>

          <div className="stat-card stat-card-active">
            <div className="stat-card-content">

              <span className="stat-card-label">
                Created
              </span>

              <strong className="stat-card-value">
                {createdCount}
              </strong>

              <span className="stat-card-description">
                Events on this page
              </span>

            </div>
          </div>

          <div className="stat-card stat-card-inactive">
            <div className="stat-card-content">

              <span className="stat-card-label">
                Changed
              </span>

              <strong className="stat-card-value">
                {changedCount}
              </strong>

              <span className="stat-card-description">
                Events on this page
              </span>

            </div>
          </div>

          <div className="stat-card stat-card-total">
            <div className="stat-card-content">

              <span className="stat-card-label">
                Deleted
              </span>

              <strong className="stat-card-value">
                {deletedCount}
              </strong>

              <span className="stat-card-description">
                Events on this page
              </span>

            </div>
          </div>

        </div>

        {/* -------------------------------- */}
        {/* LOGS PANEL */}
        {/* -------------------------------- */}

        <div className="company-users-panel company-logs-panel">

          {/* PANEL HEADER */}

          <div className="company-users-panel-header company-logs-panel-header">

            <div>
              <div className="company-page-eyebrow">
                ACTIVITY HISTORY
              </div>

              <h2>
                System activity
              </h2>

              <p>
                {pagination?.total ?? 0}{" "}
                {(pagination?.total ?? 0) === 1
                  ? "event"
                  : "events"}{" "}
                recorded
              </p>
            </div>

            <div className="company-logs-filters">

              <div className="company-users-search company-logs-search">

                <span className="company-users-search-icon">
                  ⌕
                </span>

                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search activity..."
                  value={search}
                  onFocus={() => {
                    keepSearchFocusRef.current = true;
                  }}
                  onBlur={() => {
                    keepSearchFocusRef.current = false;
                  }}
                  onChange={(event) => {
                    setSearch(event.target.value);

                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                  }}
                />

                {search && (
                  <button
                    type="button"
                    className="company-users-search-clear"
                   onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                  setPage(1);

                  keepSearchFocusRef.current = true;

                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}

              </div>

              <select
                className="company-logs-select"
                value={action}
                onChange={(event) => {
                  setAction(
                    event.target.value,
                  );

                  setPage(1);

                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
              >
                <option value="">
                  All Actions
                </option>

                {filters.actions.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {formatAction(item)}
                    </option>
                  ),
                )}
              </select>

              <select
                className="company-logs-select"
                value={entity}
                onChange={(event) => {
                  setEntity(
                    event.target.value,
                  );

                  setPage(1);

                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
              >
                <option value="">
                  All Entities
                </option>

                {filters.entities.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>

              {(search ||
                action ||
                entity) && (
                <button
                  type="button"
                  className="company-secondary-button company-logs-clear"
                  onClick={
                    clearFilters
                  }
                >
                  Clear
                </button>
              )}

            </div>
          </div>

          {/* -------------------------------- */}
          {/* EMPTY */}
          {/* -------------------------------- */}

          {!loading &&
          logs.length === 0 ? (
            <div className="company-users-empty">

              <div className="company-users-empty-icon">
                ◷
              </div>

              <h3>
                No audit events found
              </h3>

              <p>
                {search ||
                action ||
                entity
                  ? "Try changing your filters."
                  : "There are no audit events to display."}
              </p>

              {(search ||
                action ||
                entity) && (
                <button
                  type="button"
                  className="company-primary-button"
                  onClick={
                    clearFilters
                  }
                >
                  Clear filters
                </button>
              )}

            </div>
          ) : (
            <>

              {/* -------------------------------- */}
              {/* TABLE */}
              {/* -------------------------------- */}

              <div className="company-users-table-wrapper company-logs-table-wrapper">

                <table className="company-users-table company-logs-table">

                  <thead>
                    <tr>
                      <th>
                        DATE & TIME
                      </th>

                      <th>
                        ACTOR
                      </th>

                      <th>
                        ACTION
                      </th>

                      <th>
                        ENTITY
                      </th>

                      <th>
                        DESCRIPTION
                      </th>

                      <th>
                        IP ADDRESS
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {logs.map(
                      (log) => (
                        <tr
                          key={log.id}
                          className="company-log-row"
                          onClick={() =>
                            setSelectedLog(
                              log,
                            )
                          }
                        >

                          <td>
                            <div className="company-log-date">
                              {formatDate(
                                log.createdAt,
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="company-log-actor">

                              <div className="company-log-avatar">
                                {(
                                  log.actorName ||
                                  "S"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>

                                <div className="company-log-actor-name">
                                  {log.actorName ||
                                    "System"}
                                </div>

                                {log.actorEmail && (
                                  <div className="company-log-actor-email">
                                    {
                                      log.actorEmail
                                    }
                                  </div>
                                )}

                              </div>

                            </div>
                          </td>

                          <td>
                            <span
                              className={getActionClass(
                                log.action,
                              )}
                            >
                              {formatAction(
                                log.action,
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="company-log-entity">

                              <strong>
                                {log.entity}
                              </strong>

                              {log.entityId !==
                                null && (
                                <span>
                                  #
                                  {
                                    log.entityId
                                  }
                                </span>
                              )}

                            </div>
                          </td>

                          <td>
                            <div className="company-log-description">
                              {
                                log.description
                              }
                            </div>
                          </td>

                          <td>
                            <span className="company-log-ip">
                              {log.ipAddress ||
                                "—"}
                            </span>
                          </td>

                        </tr>
                      ),
                    )}

                  </tbody>

                </table>

              </div>

              {/* -------------------------------- */}
              {/* PAGINATION */}
              {/* -------------------------------- */}

              {pagination && (
                <div className="company-logs-pagination">

                  <div className="company-logs-pagination-info">

                    {pagination.total ===
                    0 ? (
                      "No events"
                    ) : (
                      <>
                        Showing{" "}
                        {(pagination.page -
                          1) *
                          pagination.limit +
                          1}{" "}
                        –{" "}
                        {Math.min(
                          pagination.page *
                            pagination.limit,
                          pagination.total,
                        )}{" "}
                        of{" "}
                        {pagination.total}
                      </>
                    )}

                  </div>

                  <div className="company-logs-pagination-controls">

                    <button
                      type="button"
                      disabled={
                        page <= 1 ||
                        loading
                      }
                      onClick={() =>
                        changePage(
                          page - 1,
                        )
                      }
                    >
                      ←
                    </button>

                    <span>
                      Page{" "}
                      {pagination.page}{" "}
                      of{" "}
                      {pagination.totalPages ||
                        1}
                    </span>

                    <button
                      type="button"
                      disabled={
                        page >=
                          pagination.totalPages ||
                        loading
                      }
                      onClick={() =>
                        changePage(
                          page + 1,
                        )
                      }
                    >
                      →
                    </button>

                  </div>

                </div>
              )}

            </>
          )}

        </div>

        {/* -------------------------------- */}
        {/* DETAIL MODAL */}
        {/* -------------------------------- */}

        {selectedLog && (
          <div
            className="company-log-modal-backdrop"
            onClick={() =>
              setSelectedLog(null)
            }
          >

            <div
              className="company-log-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="company-log-modal-header">

                <div>

                  <div className="company-page-eyebrow">
                    AUDIT EVENT #
                    {selectedLog.id}
                  </div>

                  <h2>
                    {formatAction(
                      selectedLog.action,
                    )}
                  </h2>

                </div>

                <button
                  type="button"
                  className="company-log-modal-close"
                  onClick={() =>
                    setSelectedLog(null)
                  }
                  aria-label="Close"
                >
                  ×
                </button>

              </div>

              <div className="company-log-detail-grid">

                <div>
                  <span>
                    Actor
                  </span>

                  <strong>
                    {selectedLog.actorName ||
                      "System"}
                  </strong>
                </div>

                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {selectedLog.actorEmail ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Entity
                  </span>

                  <strong>
                    {selectedLog.entity}

                    {selectedLog.entityId !==
                      null &&
                      ` #${selectedLog.entityId}`}
                  </strong>
                </div>

                <div>
                  <span>
                    Date & Time
                  </span>

                  <strong>
                    {formatDate(
                      selectedLog.createdAt,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    IP Address
                  </span>

                  <strong>
                    {selectedLog.ipAddress ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Description
                  </span>

                  <strong>
                    {selectedLog.description}
                  </strong>
                </div>

              </div>

              <div className="company-log-values">

                <div className="company-log-value-panel">

                  <div className="company-log-value-header">
                    Previous Values
                  </div>

                  <pre>
                    {selectedLog.oldValues
                      ? JSON.stringify(
                          selectedLog.oldValues,
                          null,
                          2,
                        )
                      : "No previous values"}
                  </pre>

                </div>

                <div className="company-log-value-panel">

                  <div className="company-log-value-header">
                    New Values
                  </div>

                  <pre>
                    {selectedLog.newValues
                      ? JSON.stringify(
                          selectedLog.newValues,
                          null,
                          2,
                        )
                      : "No new values"}
                  </pre>

                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}