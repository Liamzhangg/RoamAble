import logo from "../assets/logo.png";

function NavBar({ onSignIn }) {
  return (
    <header className="header-bar">
      <p className="brand-title">Accessible Travel Finder</p>
      <nav className="nav-bar">
        <div className="nav-bar__links">
          <a href="#history">History</a>
          <a href="#list">Top Attractions</a>
          <a href="#filters">Filters</a>
          <a href="#hotels">Hotels</a>
          <a href="#restaurants">Restaurants</a>
        </div>
        <button className="nav-signin" onClick={onSignIn}>
          Sign in
        </button>
      </nav>
    </header>
  );
}

export default NavBar;