"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import axios from "axios";
export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", data.accessToken);

      const user = getUser();

const permissions =
  user?.permissions || [];

if (permissions.includes("dashboard.view")) {
  router.push("/dashboard");
} else if (
  permissions.includes("users.read")
) {
  router.push("/users");
} else if (
  permissions.includes("roles.manage")
) {
  router.push("/roles");
} else {
  router.push("/access-denied");
}
    } catch (error) {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message ||
      "Unable to sign in.";

    alert(message);
  } else {
    alert("Unable to sign in.");
  }
} finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={login} className="login-form">
      <div className="login-brand">
        <div className="login-brand-mark">Sapphire</div>
      </div>

      <div className="login-heading">
        <h1>Welcome back</h1>
        <p>Sign in to your account</p>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email address</label>

        <input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <div className="password-label">
          <label htmlFor="password">Password</label>
        </div>

        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        className="login-button"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <div className="login-footer">
        <span>Secure access</span>
        <span>•</span>
        <span>RBAC protected</span>
      </div>
    </form>
  );
}