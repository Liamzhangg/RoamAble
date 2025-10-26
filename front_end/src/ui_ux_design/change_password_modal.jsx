import { useState } from "react";

function ChangePasswordModal({ isOpen, onClose, onSubmit }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (pwd.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pwd !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit?.(pwd);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Could not update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Change password">
      <div className="modal" role="document">
        <header className="modal__header">
          <div>
            <p className="eyebrow">Security</p>
            <h2>Change your password</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="modal__body" onSubmit={handleSubmit}>
          <label className="form-label">
            New password
            <input
              type="password"
              className="form-input"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className="form-label">
            Confirm password
            <input
              type="password"
              className="form-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">{error}</p>
          )}
          <div className="modal__footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;

