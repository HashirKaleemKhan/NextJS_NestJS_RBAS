"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";

type CurrentUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

export default function Header() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setUser(getUser() as CurrentUser | null);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);

    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout audit request failed:", error);
    } finally {
      logout();
    }
  };

  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="portal-badge">
          Pakistan Admin Portal
        </div>

        <span className="header-date">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="app-header-right">
        <button
          type="button"
          className="header-icon-button"
          aria-label="Notifications"
        >
          <span className="header-bell-icon">●</span>
          <span className="notification-dot" />
        </button>

        <div className="header-user-wrapper">
          <button
            type="button"
            className="header-user-button"
            onClick={() =>
              setDropdownOpen((current) => !current)
            }
          >
            <span className="header-user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>

            <span className="header-user-name">
              {user?.name || "User"}
            </span>

            <span
              className={`header-chevron ${
                dropdownOpen ? "open" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {dropdownOpen && (
            <div className="header-dropdown">
              <div className="header-dropdown-user">
                <div className="header-dropdown-name">
                  {user?.name || "User"}
                </div>

                <div className="header-dropdown-email">
                  {user?.email || ""}
                </div>

                {user?.role && (
                  <div className="header-dropdown-role">
                    {user.role}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="header-signout"
                onClick={handleLogout}
              >
                <span>↪</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}