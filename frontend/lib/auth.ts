import { jwtDecode } from "jwt-decode";

export function getUser() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

export function getFirstAllowedRoute() {
  const user: any = getUser();

  const permissions: string[] =
    user?.permissions || [];

  if (permissions.includes("dashboard.view")) {
    return "/dashboard";
  }

  if (permissions.includes("users.read")) {
    return "/users";
  }

  if (permissions.includes("roles.manage")) {
    return "/roles";
  }

  return "/access-denied";
}