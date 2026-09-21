"use client";

import { useState } from "react";

import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

import { getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        name
        email
        role
        permissions
        isAdmin
        active
      }
    }
  }
`;

type LoginMutationData = {
  login: {
    accessToken: string;
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
      permissions: string[];
      isAdmin: boolean;
      active: boolean | null;
    };
  };
};

type LoginMutationVariables = {
  input: {
    email: string;
    password: string;
  };
};

export default function LoginForm() {
  const router = useRouter();

  const [loginMutation] = useMutation<
    LoginMutationData,
    LoginMutationVariables
  >(LOGIN_MUTATION);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError(
        "Please enter your email address and password.",
      );
      return;
    }

    setLoading(true);

    try {
      const result = await loginMutation({
        variables: {
          input: {
            email: email.trim(),
            password,
          },
        },
      });

      const loginData = result.data?.login;

      if (!loginData?.accessToken) {
        throw new Error(
          "Unable to sign in. Please try again.",
        );
      }

      localStorage.setItem(
        "token",
        loginData.accessToken,
      );

      const user = getUser();

      const permissions =
        user?.permissions ||
        loginData.user.permissions ||
        [];

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
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please check your credentials and try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-wrapper">
      <div className="auth-form-brand">
        <div className="auth-form-brand-mark">
          S
        </div>
      </div>

      <div className="auth-form-heading">
        <div className="auth-form-eyebrow">
          SECURE PORTAL
        </div>

        <h2>Welcome back</h2>

        <p>
          Sign in to continue to your management
          portal.
        </p>
      </div>

      {error && (
        <div
          className="auth-error"
          role="alert"
        >
          <div className="auth-error-icon">
            !
          </div>

          <div className="auth-error-content">
            <strong>
              Sign in unsuccessful
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            className="auth-error-close"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <form
        onSubmit={login}
        className="auth-form"
      >
        <div className="auth-field">
          <label htmlFor="email">
            Email address
          </label>

          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              @
            </span>

            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password">
            Password
          </label>

          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              •
            </span>

            <input
              id="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              disabled={loading}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="auth-password-toggle"
              onClick={() =>
                setShowPassword(
                  (current) => !current,
                )
              }
              disabled={loading}
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword
                ? "Hide"
                : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="auth-submit-button"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="auth-button-spinner" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <span className="auth-submit-arrow">
                →
              </span>
            </>
          )}
        </button>
      </form>

      <div className="auth-register-link">
        <span>
          Don't have an account?
        </span>

        <button
          type="button"
          onClick={() =>
            router.push("/register")
          }
          disabled={loading}
        >
          Create one
        </button>
      </div>

      <div className="auth-security-note">
        <span>RBAC protected</span>
        <span>•</span>
        <span>Secure access</span>
      </div>
    </div>
  );
}