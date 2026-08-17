import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-background">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
      </div>

      <div className="login-container">
        <LoginForm />
      </div>
    </main>
  );
}