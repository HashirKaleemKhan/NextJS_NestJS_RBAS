import { jwtDecode, JwtPayload } from "jwt-decode";

type AppUser = JwtPayload & {
  sub: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
};

export function getUser(): AppUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  try {
    return jwtDecode<AppUser>(token);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

export function getFirstAllowedRoute() {
  const user = getUser();

  const permissions =
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