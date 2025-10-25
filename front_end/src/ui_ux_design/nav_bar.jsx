function NavBar({ onSignIn }) {
  return (
    <nav className="nav-bar">
      <div className="brand">
        <span className="brand__icon" aria-hidden="true">
          ♿
        </span>
        Accessible Travel Finder
      </div>
      <div className="nav-bar__links">
        <a href="#map">Map</a>
        <a href="#list">Places</a>
        <a href="#stories">Stories</a>
      </div>
      <button className="btn btn-secondary" onClick={onSignIn}>
        Sign in
      </button>
    </nav>
  );
}

export default NavBar;
