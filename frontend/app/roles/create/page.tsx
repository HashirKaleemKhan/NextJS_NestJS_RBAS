"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getUser, logout } from "@/lib/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

import RoleForm from "../components/RoleForm";

import "../roles.css";

export default function CreateRolePage() {
  const router = useRouter();

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const user: any = getUser();

    const permissions: string[] =
      user?.permissions || [];

    const isAdmin =
      user?.isAdmin === true;

    if (
      !isAdmin &&
      !permissions.includes(
        "roles.manage",
      )
    ) {
      router.replace("/dashboard");
    }
  }, [router]);

  function handleSuccess(
    message: string,
  ) {
    sessionStorage.setItem(
      "rolesSuccessMessage",
      message,
    );

    router.push("/roles");
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            ACCESS CONTROL
          </div>

          <h1>Create role</h1>

          <p>
            Create a new role and configure
            its access permissions.
          </p>
        </div>

        <button
          className="button button-secondary"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      <div className="content-card role-form-card">
        <div className="card-header">
          <div>
            <h2>Role details</h2>

            <p>
              Configure the role, reporting
              structure, status, and permissions.
            </p>
          </div>
        </div>

        <RoleForm
          mode="create"
          onSuccess={handleSuccess}
        />
      </div>
    </DashboardLayout>
  );
}