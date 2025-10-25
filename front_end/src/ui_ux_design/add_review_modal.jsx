import { useEffect, useState } from "react";

const featureOptions = [
  { key: "entrance", label: "Step-free entrance" },
  { key: "restroom", label: "Accessible restroom" },
  { key: "service", label: "Trained staff" },
];

function AddReviewModal({ isOpen, onClose, onSubmit, placeName = "" }) {
  const [formState, setFormState] = useState({
    name: placeName ?? "",
    rating: 5,
    comment: "",
    highlights: [],
  });

  useEffect(() => {
    setFormState((previous) => ({
      ...previous,
      name: placeName ?? previous.name,
    }));
  }, [placeName]);

  useEffect(() => {
    if (!isOpen) {
      setFormState({
        name: placeName ?? "",
        rating: 5,
        comment: "",
        highlights: [],
      });
    }
  }, [isOpen, placeName]);

  if (!isOpen) {
    return null;
  }

  const toggleHighlight = (key) => {
    setFormState((previous) => {
      const highlights = previous.highlights.includes(key)
        ? previous.highlights.filter((item) => item !== key)
        : [...previous.highlights, key];
      return { ...previous, highlights };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(formState);
    onClose?.();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal__header">
          <div>
            <p className="eyebrow">Share your experience</p>
            <h2>Add a review</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="modal__body" onSubmit={handleSubmit}>
          <label className="form-label">
            Place name
            <input
              type="text"
              className="form-input"
              value={formState.name}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              placeholder="e.g., Harbourfront Centre"
              required
            />
          </label>

          <label className="form-label">
            Rating
            <input
              type="number"
              className="form-input"
              min="1"
              max="5"
              step="0.5"
              value={formState.rating}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  rating: Number(event.target.value),
                }))
              }
            />
          </label>

          <label className="form-label">
            Highlights
            <div className="highlight-grid">
              {featureOptions.map((feature) => (
                <button
                  key={feature.key}
                  type="button"
                  className={`filter-chip ${
                    formState.highlights.includes(feature.key) ? "is-active" : ""
                  }`}
                  onClick={() => toggleHighlight(feature.key)}
                >
                  {feature.label}
                </button>
              ))}
            </div>
          </label>

          <label className="form-label">
            Details
            <textarea
              className="form-textarea"
              rows={4}
              value={formState.comment}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  comment: event.target.value,
                }))
              }
              placeholder="What made this spot accessible or challenging?"
            />
          </label>

          <div className="modal__footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddReviewModal;
