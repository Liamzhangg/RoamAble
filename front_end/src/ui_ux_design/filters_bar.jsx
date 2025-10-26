import { FILTER_OPTIONS } from "./filter_options.js";

function FiltersBar({ filters = {}, onChange, bare = false, showLabel = true, className = "" }) {
  const handleToggle = (key) => {
    onChange?.({
      ...filters,
      [key]: !filters[key],
    });
  };

  const Wrapper = bare ? "div" : "section";
  const wrapperClass = bare
    ? `filters-bar ${className}`.trim()
    : `panel filters-bar ${className}`.trim();

  return (
    <Wrapper className={wrapperClass}>
      {!bare && showLabel && <div className="panel-label">Access filters</div>}
      <div className="filters-bar__chips">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => handleToggle(filter.key)}
            className={`filter-chip ${filters[filter.key] ? "is-active" : ""}`}
          >
            <span className="filter-chip__label">{filter.label}</span>
            <span className="filter-chip__helper">{filter.helper}</span>
          </button>
        ))}
      </div>
    </Wrapper>
  );
}

export default FiltersBar;
