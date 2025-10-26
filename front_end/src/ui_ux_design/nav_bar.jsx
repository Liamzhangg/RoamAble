import { useEffect, useRef, useState } from "react";

const SEARCH_SUGGESTIONS = [
  { label: "Step-free museums", value: "step-free museums" },
  { label: "Quiet restaurants", value: "quiet restaurants" },
  { label: "Accessible hotels", value: "accessible hotels" },
  { label: "Braille menus", value: "braille menu" },
];

function NavBar({
  onSignIn,
  onSignOut,
  onSearch,
  onOpenFilters,
  onToggleAttractions,
  onSetStartLocation,
  searchQuery = "",
  user,
  isDisabled = false,
  originLabel = "Toronto City Hall",
  isLocatingStart = false,
}) {
  const [query, setQuery] = useState(searchQuery);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const inertProps = isDisabled ? { "aria-hidden": "true", inert: "" } : {};

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClick = (event) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isDropdownOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch?.(query.trim());
    setIsDropdownOpen(false);
  };

  const handleSuggestionClick = (value) => {
    setQuery(value);
    onSearch?.(value);
    setIsDropdownOpen(false);
  };

  return (
    <header className={`header-bar ${isDisabled ? "is-blocked" : ""}`} {...inertProps}>
      <nav className="nav-bar">
        <div className="nav-search" ref={searchRef}>
          <form className="nav-search__form" onSubmit={handleSubmit}>
            <input
              id="nav-search-input"
              type="text"
              className="nav-search__input"
              value={query}
              placeholder="Search by city, venue, or keyword"
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              className="nav-search__toggle"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-controls="nav-search-dropdown"
            >
              Suggestions <span aria-hidden="true">{isDropdownOpen ? "▲" : "▼"}</span>
            </button>
            <button type="submit" className="btn btn-primary nav-search__submit">
              Search
            </button>
          </form>
          {isDropdownOpen && (
            <div id="nav-search-dropdown" className="nav-search__dropdown">
              <p className="nav-search__hint">Try one of these popular filters:</p>
              <div className="nav-search__suggestions">
                {SEARCH_SUGGESTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="nav-search__suggestion"
                    onClick={() => handleSuggestionClick(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="nav-bar__links">
          <a
            href="#set_start_location"
            onClick={(event) => {
              event.preventDefault();
              onSetStartLocation?.();
            }}
            aria-live="polite"
          >
            {isLocatingStart ? "Locating..." : "Set Start Location"}
          </a>
          <span className="nav-start-label">From: {originLabel}</span>
          <a href="#history">History</a>
          {/* <a
            href="#list"
            onClick={(e) => {
              e.preventDefault();
              onToggleAttractions?.();
            }}
          >
            Top Attractions
          </a> */}
          <a
            href="#filters"
            onClick={(e) => {
              e.preventDefault();
              onOpenFilters?.();
            }}
          >
            Filters
          </a>
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
