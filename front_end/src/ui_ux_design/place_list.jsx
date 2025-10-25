function PlaceList({ places = [], selectedPlaceId, onSelect }) {
  if (!places.length) {
    return (
      <section className="panel place-list">
        <div className="place-list__empty">
          No matches yet. Adjust your search or filters to discover more spots.
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

      <ul className="place-list__items">
        {places.map((place) => {
          const isActive = selectedPlaceId === place.id;
          return (
            <li
              key={place.id}
              className={`place-card ${isActive ? "is-active" : ""}`}
              onClick={() => onSelect?.(place)}
            >
              <div className="place-card__image" aria-hidden="true">
                {place.photo ? (
                  <img src={place.photo} alt="" loading="lazy" />
                ) : (
                  <span>{place.name.charAt(0)}</span>
                )}
              </div>
              <div className="place-card__body">
                <div className="place-card__title-row">
                  <h3>{place.name}</h3>
                  <span className="rating-badge">{place.rating.toFixed(1)}</span>
                </div>
                <p className="place-card__location">{place.location}</p>
                <p className="place-card__description">{place.description}</p>
                <div className="place-card__meta">
                  <span>{place.reviews} reviews</span>
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
