function PlaceList({ places = [], selectedPlaceId, onSelect, isLoading = false, statusMessage }) {
  if (isLoading) {
    return (
      <section className="panel place-list">
        <div className="place-list__empty">Searching for accessible places...</div>
      </section>
    );
  }

  if (!places.length) {
    return (
      <section className="panel place-list">
        <div className="place-list__empty">
          {statusMessage || "No matches yet. Adjust your search or filters to discover more spots."}
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
      {statusMessage && <p className="place-list__status">{statusMessage}</p>}

      <ul className="place-list__items">
        {places.map((place) => {
          const rating =
            typeof place.rating === "number" && Number.isFinite(place.rating) ? place.rating : null;
          const ratingLabel = rating !== null ? rating.toFixed(1) : "N/A";
          const description = place.description || place.location || "Accessible location";
          const reviewsLabel =
            typeof place.reviews === "number" && Number.isFinite(place.reviews)
              ? `${place.reviews} reviews`
              : place.source === "nominatim"
              ? "OpenStreetMap data"
              : "Reviews unavailable";
          const tags = Array.isArray(place.tags) ? place.tags : [];

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
                  <span className="rating-badge">{ratingLabel}</span>
                </div>
                <p className="place-card__location">{place.location}</p>
                <p className="place-card__description">{description}</p>
                <div className="place-card__meta">
                  <span>{reviewsLabel}</span>
                  <div className="place-card__tags">
                    {tags.map((tag) => (
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
