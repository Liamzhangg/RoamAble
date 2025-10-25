const FILTER_OPTIONS = [
  {
    key: "wheelchair",
    label: "Step-free access",
    helper: "Entrances, restrooms, and seating are wheelchair friendly.",
  },
  {
    key: "braille",
    label: "Braille or tactile signage",
    helper: "Menus, elevator buttons, or exhibits include tactile guidance.",
  },
  {
    key: "assistiveAudio",
    label: "Assistive audio",
    helper: "Guided tours or devices support visitors with low vision.",
  },
];

function FiltersBar({ filters = {}, onChange }) {
  const handleToggle = (key) => {
    onChange?.({
      ...filters,
      [key]: !filters[key],
    });
  };

  return (
    <section className="panel filters-bar">
      <div className="panel-label">Access filters</div>
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
    </section>
  );
}

export default FiltersBar;
