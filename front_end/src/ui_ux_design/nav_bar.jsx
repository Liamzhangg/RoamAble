import logo from "../assets/logo.png";

function NavBar({ onSignIn }) {
  return (
    <header className="header-bar">
      <img src={logo} alt="Accessible Travel Finder" className="brand-logo" />
      <p className="brand-title">Accessible Travel Finder</p>
      <nav className="nav-bar">
        <div className="nav-bar__links">
          <a href="#map">Routes</a>
          <a href="#list">Top Attractions</a>
          <a href="#restaurants">Restaurants</a>
          <a href="#stories">Reviews</a>
        </div>
        <button className="nav-signin" onClick={onSignIn}>
          Sign in
        </button>
      </nav>
    </header>
  );
}

export default NavBar;