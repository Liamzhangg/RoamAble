import { useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

function LoginScreen({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("signin"); // 'signin' | 'signup'

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        throw new Error("Please enter both email and password.");
      }
      let user;
      if (formMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
        if (error) throw error;
        user = data.user;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (error) throw error;
        user = data.user;
      }
      onSuccess?.(user);
    } catch (err) {
      setError(err?.message || "Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-overlay" role="dialog" aria-modal="true">
      <section className="panel login-card login-modal">
        <div className="login-modal__header">
          <p className="eyebrow">Welcome back</p>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {showForm ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>{formMode === "signup" ? "Create your account" : "Continue with email"}</h2>
            <p>
              {formMode === "signup"
                ? "Create a secure profile to sync favourites everywhere."
                : "Enter the email and password tied to your RoamAble account."}
            </p>
            <label className="form-label" htmlFor="login-email">
              Email
              <input
                id="login-email"
                type="email"
                className="form-input"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="form-label" htmlFor="login-password">
              Password
              <input
                id="login-password"
                type="password"
                className="form-input"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="login-card__actions">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? formMode === "signup"
                    ? "Creating..."
                    : "Signing in..."
                  : formMode === "signup"
                  ? "Create account"
                  : "Sign in"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Back
              </button>
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Maybe later
            </button>
          </form>
        ) : (
          <>
            <h2>Log in to save your accessible routes</h2>
            <p>
              Keep bookmarks of past routes taken, save favourite locations, and share top attractions with friends.
            </p>
            <div className="login-card__actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setFormMode("signin");
                  setShowForm(true);
                }}
              >
                Continue with email
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setFormMode("signup");
                  setShowForm(true);
                }}
              >
                Create an account
              </button>
              <button className="btn btn-ghost" onClick={onClose}>
                Maybe later
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default LoginScreen;
