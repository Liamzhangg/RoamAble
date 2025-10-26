function PlaceList({
  places = [],
  selectedPlaceId,
  onSelect,
  isLoading = false,
  errorMessage = "",
}) {
  if (isLoading) {
    return (
      <section className="panel place-list">
        <div className="place-list__empty">Searching for accessible locations…</div>
      </section>
    );
  }

  if (!places.length) {
    return (
      <section className="panel place-list">
        <div className="place-list__empty">
          {errorMessage || "No matches yet. Adjust your search or filters to discover more spots."}
        </div>
      </section>
    );
  }

  return (
    <section className="panel place-list">
      <header className="place-list__header">
        <div>
          <p className="eyebrow">Recommended nearby</p>
          <h2>Featured accessible places</h2>
        </div>
        <span className="pill">{places.length} listed</span>
      </header>
      {errorMessage && <p className="route-panel__error">{errorMessage}</p>}

      <ul className="place-list__items">
        {places.map((place) => {
          const isActive = selectedPlaceId === place.id;
          return (
            <li
              key={place.id}
              className={`place-card ${isActive ? "is-active" : ""}`}
              onClick={() => onSelect?.(place)}
            >
              {place.photo && (
                <div className="place-card__image" aria-hidden="true">
                  <img src={place.photo} alt="" loading="lazy" />
                </div>
              )}
              <div className="place-card__body">
                <div className="place-card__title-row">
                  <h3>{place.name}</h3>
                  <span className="rating-badge">
                    {typeof place.rating === "number" ? place.rating.toFixed(1) : "—"}
                  </span>
                </div>
                <p className="place-card__location">{place.location}</p>
                <p className="place-card__description">{place.description}</p>
                <div className="place-card__meta">
                  <span>
                    {typeof place.reviews === "number" ? `${place.reviews} reviews` : "New listing"}
                  </span>
                  <div className="place-card__tags">
                    {place.tags?.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default PlaceList;
