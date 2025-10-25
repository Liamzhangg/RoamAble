import { useEffect, useState } from "react";

const DEFAULT_PLACEHOLDER = "Search by city, venue, or keyword";

function SearchBox({ initialQuery = "", onSearch }) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch?.(query.trim());
  };

  return (
    <form className="panel search-box" onSubmit={handleSubmit}>
      <label className="panel-label" htmlFor="search-input">
        Destination or spot
      </label>
      <div className="search-box__controls">
        <input
          id="search-input"
          type="text"
          className="search-box__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={DEFAULT_PLACEHOLDER}
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </div>
    </form>
  );
}

export default SearchBox;
