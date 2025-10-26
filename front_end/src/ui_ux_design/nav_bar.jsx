import { useEffect, useRef, useState } from "react";

const FALLBACK_SUGGESTIONS = [
  "Harbourfront Centre",
  "Accessible hotels",
  "Step-free museums",
];

function NavBar({
  onProfileClick,
  onSignOut,
  onChangePassword,
  onUploadAvatar,
  onSearch,
  onOpenFilters,
  onSetStartLocation,
  onApplyStartLocation,
  searchQuery = "",
  user,
  recentSearches = [],
  isDisabled = false,
  originLabel = "Toronto City Hall",
  isLocatingStart = false,
}) {
  const [query, setQuery] = useState(searchQuery);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [originDraft, setOriginDraft] = useState(originLabel);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const iconRef = useRef(null);

  const inertProps = isDisabled ? { "aria-hidden": "true", inert: "" } : {};

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setOriginDraft(originLabel);
  }, [originLabel]);

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

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (event) => {
      const clickedMenu = menuRef.current?.contains(event.target);
      const clickedIcon = iconRef.current?.contains(event.target);
      if (!clickedMenu && !clickedIcon) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!user) {
      setIsMenuOpen(false);
    }
  }, [user]);

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

  const handleProfileToggle = () => {
    if (user) {
      setIsMenuOpen((previous) => !previous);
    } else {
      setIsMenuOpen(false);
      onProfileClick?.();
    }
  };

  const avatarLabel = user?.email?.charAt(0)?.toUpperCase() ?? "👤";
  const handleOriginSubmit = async (event) => {
    event.preventDefault();
    if (isDisabled) return;
    const trimmed = (originDraft || "").trim();
    if (!trimmed) {
      onSetStartLocation?.();
      return;
    }
    await onApplyStartLocation?.(trimmed);
  };

  const suggestions = recentSearches?.length ? recentSearches : FALLBACK_SUGGESTIONS;

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
              Recent <span aria-hidden="true">{isDropdownOpen ? "▲" : "▼"}</span>
            </button>
            <button type="submit" className="btn btn-primary nav-search__submit">
              Search
            </button>
          </form>
          {isDropdownOpen && (
            <div id="nav-search-dropdown" className="nav-search__dropdown">
              <p className="nav-search__hint">Recent searches</p>
              <div className="nav-search__suggestions">
                {suggestions.slice(0, 3).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="nav-search__suggestion"
                    onClick={() => handleSuggestionClick(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="nav-bar__links" role="navigation">
          <form className="nav-origin" onSubmit={handleOriginSubmit}>
            <label className="nav-origin__label" htmlFor="nav-origin-input">
              From:
            </label>
            <input
              id="nav-origin-input"
              type="text"
              className="nav-origin__input"
              value={originDraft}
              onChange={(event) => setOriginDraft(event.target.value)}
              placeholder="Enter starting point"
              disabled={isDisabled}
            />
            <button
              type="submit"
              className="btn btn-ghost nav-origin__apply"
              disabled={isDisabled || isLocatingStart || !originDraft.trim()}
            >
              Apply
            </button>
          </form>
          <button
            type="button"
            className="btn btn-ghost nav-origin__current"
            onClick={(event) => {
              event.preventDefault();
              onSetStartLocation?.();
            }}
            disabled={isDisabled || isLocatingStart}
          >
            {isLocatingStart ? "Locating..." : "Use current"}
          </button>
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
        <div className="nav-actions">
          <button
            type="button"
            className={`nav-icon ${user ? "is-authenticated" : ""}`}
            onClick={handleProfileToggle}
            aria-label={user ? "Account menu" : "Open sign in"}
            ref={iconRef}
          >
            {avatarLabel}
          </button>
          {user && isMenuOpen && (
            <div className="nav-profile-menu" ref={menuRef}>
              <span className="nav-profile-menu__email">{user.email}</span>
              {onChangePassword && (
                <button
                  className="nav-profile-menu__action nav-profile-menu__action--ghost"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onChangePassword();
                  }}
                >
                  Change password
                </button>
              )}
              {onUploadAvatar && (
                <button
                  className="nav-profile-menu__action nav-profile-menu__action--ghost"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onUploadAvatar();
                  }}
                >
                  Upload photo
                </button>
              )}
              <button
                className="nav-profile-menu__action"
                onClick={() => {
                  setIsMenuOpen(false);
                  onSignOut?.();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
