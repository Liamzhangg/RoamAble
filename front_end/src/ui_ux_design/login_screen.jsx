import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./lib/firebase.js";

function LoginScreen({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      onSuccess?.(credential.user);
    } catch (err) {
      setError(mapFirebaseError(err));
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
            <h2>Continue with email</h2>
            <p>Enter the email and password tied to your AccessMap account.</p>
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
                {isSubmitting ? "Signing in..." : "Sign in"}
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
              Keep bookmarks synced across devices, follow curators you trust, and share quick accessibility snapshots while you explore.
            </p>
            <div className="login-card__actions">
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                Continue with email
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

function mapFirebaseError(error) {
  const code = error?.code ?? "";
  if (code.includes("auth/invalid-credential")) return "That email or password didn’t match.";
  if (code.includes("auth/user-not-found")) return "No account exists for that email.";
  if (code.includes("auth/wrong-password")) return "Incorrect password. Please try again.";
  if (code.includes("auth/too-many-requests")) return "Too many unsuccessful attempts. Please wait and try again.";
  return "Unable to sign in right now. Please try again.";
}

export default LoginScreen;
