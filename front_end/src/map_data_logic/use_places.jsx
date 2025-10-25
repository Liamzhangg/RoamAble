import { useState, useEffect } from "react";

export function usePlaces() {
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    // dummy test data
    setPlaces([
      { id: 1, name: "CN Tower", lat: 43.6426, lng: -79.3871, accessibility: 4 },
      { id: 2, name: "Royal Ontario Museum", lat: 43.6677, lng: -79.3948, accessibility: 5 },
      { id: 3, name: "Ripley's Aquarium", lat: 43.6424, lng: -79.3860, accessibility: 3 },
    ]);
  }, []);

  return { places };
}
