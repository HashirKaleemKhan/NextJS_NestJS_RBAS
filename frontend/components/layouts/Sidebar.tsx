"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

const links = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "⌂",
    permission: "dashboard.view",
  },
  {
    label: "Users",
    href: "/users",
    icon: "◉",
    permission: "users.read",
  },
  {
    label: "Your Hierarchy",
    href: "/hierarchy",
    icon: "⌘",
    permission: "users.read",
  },
  {
    label: "Roles",
    href: "/roles",
    icon: "◆",
    permission: "roles.manage",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [permissions, setPermissions] =
    useState<string[]>([]);

  useEffect(() => {
    const user: any = getUser();

    setPermissions(user?.permissions || []);
  }, []);

  const visibleLinks = links.filter((link) => {
    return permissions.includes(
      link.permission,
    );
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          A
        </div>

        <div>
          <div className="brand-name">
            AdminPanel
          </div>

          <div className="brand-subtitle">
            Management System
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">
          MAIN
        </div>

        {visibleLinks.map((link) => {
          const active =
            pathname === link.href;

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

              <span>{link.label}</span>
            </Link>
          );
        })}

        {visibleLinks.length === 0 && (
          <div className="sidebar-no-access">
            No available sections
          </div>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-version">
          RBAC Admin • v1.0
        </div>
      </div>
    </aside>
  );
}