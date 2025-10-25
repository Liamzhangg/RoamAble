function LoginScreen({ onClose }) {
  return (
    <div className="login-overlay" role="dialog" aria-modal="true">
      <section className="panel login-card login-modal">
        <div className="login-modal__header">
          <p className="eyebrow">Welcome back</p>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <h2>Log in to save your accessible routes</h2>
        <p>
          Keep bookmarks synced across devices, follow curators you trust, and
          share quick accessibility snapshots while you are out exploring.
        </p>
        <div className="login-card__actions">
          <button className="btn btn-primary">Continue with email</button>
          <button className="btn btn-ghost" onClick={onClose}>
            Maybe later
          </button>
        </div>
      </section>
    </div>
  );
}

export default LoginScreen;
