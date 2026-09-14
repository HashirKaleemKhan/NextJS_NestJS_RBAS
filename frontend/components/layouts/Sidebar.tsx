"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getUser } from "@/lib/auth";

const links = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "▦",
    permission: "dashboard.view",
  },
  {
    label: "Users",
    href: "/users",
    icon: "◉",
    permission: "users.read",
  },
  {
    label: "Roles",
    href: "/roles",
    icon: "◆",
    permission: "roles.manage",
  },
  {
    label: "Groups",
    href: "/groups",
    icon: "▣",
    permission: "roles.manage",
  },
  {
    label: "Your Hierarchy",
    href: "/hierarchy",
    icon: "⌘",
    permission: "users.read",
  },
  {
  label: "Audit Logs",
  href: "/logs",
  icon: "◷",
  permission: "logs.read",
},
];

type CurrentUser = {
  name?: string;
  email?: string;
  role?: string;
};

export default function Sidebar() {
  const pathname = usePathname();

  const [permissions, setPermissions] = useState<string[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const currentUser = getUser() as CurrentUser | null;

    setUser(currentUser);
    setPermissions(
      (currentUser as any)?.permissions || [],
    );
  }, []);

  const visibleLinks = links.filter((link) =>
    permissions.includes(link.permission),
  );

  return (
    <aside className="sidebar">
      {/* BRAND */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          A
        </div>

        <div className="brand-copy">
          <div className="brand-name">
            AdminPanel
          </div>

          <div className="brand-subtitle">
            Management System
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">
          MAIN
        </div>

        {visibleLinks.map((link) => {
          const active =
            pathname === link.href ||
            pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${
                active ? "active" : ""
              }`}
            >
              <span className="nav-icon">
                {link.icon}
              </span>

              <span className="nav-label">
                {link.label}
              </span>
            </Link>
          );
        })}

        {visibleLinks.length === 0 && (
          <div className="sidebar-no-access">
            No available sections
          </div>
        )}
      </nav>

      {/* USER / VERSION */}
      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {user?.name || "User"}
            </div>

            <div className="sidebar-user-role">
              {user?.role || "Account"}
            </div>
          </div>
        </div>

        <div className="sidebar-version">
          RBAC Admin <span>•</span> v1.0
        </div>
      </div>
    </aside>
  );
}