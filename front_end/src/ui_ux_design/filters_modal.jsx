import { FILTER_OPTIONS } from "./filters_bar.jsx";

function FiltersModal({ isOpen, onClose, filters, onChange }) {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleToggle = (key) => {
    onChange?.({
      ...filters,
      [key]: !filters[key],
    });
  };

  return (
    <div
      className="filters-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="filters-modal" role="document">
        <header className="filters-modal__header">
          <div>
            <h2 id="filters-modal-title">Access filters</h2>
            <p className="filters-modal__subtitle">
              Toggle the access features you need for this search.
            </p>
          </div>
          <button className="btn btn-ghost filters-modal__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="filters-modal__chips">
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
      </div>
    </div>
  );
}

export default FiltersModal;
