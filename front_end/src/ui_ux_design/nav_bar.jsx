import { useEffect, useState } from "react";

function NavBar({ onSignIn, onSignOut, onSearch, searchQuery = "", user }) {
  const [query, setQuery] = useState(searchQuery);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch?.(query.trim());
  };

  return (
    <header className="header-bar">
      <nav className="nav-bar">
        <form className="nav-search__form" onSubmit={handleSubmit}>
          <input
            id="nav-search-input"
            type="text"
            className="nav-search__input"
            value={query}
            placeholder="Search by city, venue, or keyword"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="btn btn-primary nav-search__submit">
            Search
          </button>
        </form>
        <div className="nav-bar__links">
          <a href="#history">History</a>
          <a href="#list">Top Attractions</a>
          <a href="#filters">Filters</a>
          <a href="#hotels">Hotels</a>
          <a href="#restaurants">Restaurants</a>
        </div>
        <div className="nav-auth">
          {user ? (
            <>
              <span className="nav-auth__user" title={user.email ?? "Signed in"}>
                {user.email ?? "Signed in"}
              </span>
              <button className="nav-signin nav-signin--solid" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <button className="nav-signin nav-signin--solid" onClick={onSignIn}>
              Sign in
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
