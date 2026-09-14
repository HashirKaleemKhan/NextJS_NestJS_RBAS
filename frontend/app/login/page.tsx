"use client";

import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-showcase">
          <div className="auth-showcase-glow auth-showcase-glow-one" />
          <div className="auth-showcase-glow auth-showcase-glow-two" />

          <div className="auth-showcase-content">
            <div className="auth-brand">
              <div className="auth-brand-mark">S</div>

              <div>
                <div className="auth-brand-name">
                  Sapphire
                </div>

                <div className="auth-brand-subtitle">
                  User Management Portal
                </div>
              </div>
            </div>

            <div className="auth-showcase-copy">
              <span className="auth-eyebrow">
                ACCESS • ROLES • PERMISSIONS
              </span>

              <h1>
                Secure access
                <span>for your organization.</span>
              </h1>

              <p>
                Manage users, assign roles, and control
                access through a streamlined platform
                designed for operational clarity and
                accountability.
              </p>
            </div>

            <div className="auth-showcase-stats">
              <div className="auth-showcase-stat">
                <strong>RBAC</strong>
                <span>Permission controlled</span>
              </div>

              <div className="auth-showcase-stat">
                <strong>24/7</strong>
                <span>User visibility</span>
              </div>

              <div className="auth-showcase-stat">
                <strong>Secure</strong>
                <span>Protected access</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-form-side">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}