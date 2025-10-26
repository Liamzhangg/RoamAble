import avatarDefault from "./assets/avatar_default.png";
import logo from "./assets/logo.png";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Popup,
  ZoomControl,
  Marker,
  ScaleControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import AddReviewModal from "./ui_ux_design/add_review_modal.jsx";
import NavBar from "./ui_ux_design/nav_bar.jsx";
import PlaceList from "./ui_ux_design/place_list.jsx";
import LoginScreen from "./ui_ux_design/login_screen.jsx";
import FiltersModal from "./ui_ux_design/filters_modal.jsx";
import ChangePasswordModal from "./ui_ux_design/change_password_modal.jsx";
import { supabase } from "./ui_ux_design/lib/supabaseClient.js";
// Fix Leaflet marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url),
});

const PLACES = [
  {
    id: "p-1",
    name: "Harbourfront Centre",
    location: "Toronto, Canada",
    rating: 4.8,
    lat: 43.6376,
    lng: -79.3816,
    tags: ["Step-free", "Assistive audio"],
    features: { wheelchair: true, braille: false, assistiveAudio: true },
    description:
      "Waterfront arts hub with elevators, tactile markers, and staff trained in accessible guest support.",
  },
  {
    id: "p-2",
    name: "Royal Ontario Museum",
    location: "Toronto, Canada",
    rating: 4.7,
    lat: 43.6677,
    lng: -79.3948,
    tags: ["Braille menu", "Quiet hours"],
    features: { wheelchair: true, braille: true, assistiveAudio: false },
    description:
      "Museum with elevators, braille exhibits, and staff assistance for mobility access.",
  },
];

const DEFAULT_FILTERS = {
  wheelchair: false,
  braille: false,
  assistiveAudio: false,
};

function App() {
  // Close profile menu on outside click
  useEffect(() => {
    const close = () => {
      document.querySelectorAll('.profile-menu.is-open').forEach(el => el.classList.remove('is-open'));
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedPlace, setSelectedPlace] = useState(PLACES[0] ?? null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAttractionsOpen, setIsAttractionsOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const isInteractionLocked = isModalOpen || isFiltersOpen || isLoginOpen || isPasswordOpen;
  const inertProps = isInteractionLocked ? { "aria-hidden": "true", inert: "" } : {};
  async function fetchRecent() {
    if (!user) { setRecentSearches([]); return; }
    const { data } = await supabase
      .from("recent_searches")
      .select("query")
      .eq("user_id", user.id || user.uid)
      .order("created_at", { ascending: false })
      .limit(6);
    setRecentSearches((data || []).map((r) => r.query));
  }

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (user && query) {
      try {
        await supabase.from("recent_searches").insert({ user_id: user.id || user.uid, query });
        fetchRecent();
      } catch {}
    }
  };

  // Subscribe to Firebase Auth state; keeps users signed in across refreshes

  const handleSubmitReview = (data) => {
    setSubmittedReviews((previous) => [
      ...previous,
      { ...data, id: `${Date.now()}`, createdAt: new Date().toISOString() },
    ]);
  };

  const filteredPlaces = useMemo(() => {
    return PLACES.filter((place) => {
      const matchesQuery =
        !searchQuery ||
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return place.features[key];
      });

      return matchesQuery && matchesFilters;
    });
  }, [filters, searchQuery]);

  useEffect(() => {
    if (!filteredPlaces.length) {
      setSelectedPlace(null);
      return;
    }
    const stillVisible = filteredPlaces.some((p) => p.id === selectedPlace?.id);
    if (!stillVisible) setSelectedPlace(filteredPlaces[0]);
  }, [filteredPlaces, selectedPlace]);

  const handleSignOut = async () => {
    setUser(null);
  };

  function FlyToSelected({ coords }) {
    const map = useMap();
    useEffect(() => {
      if (!coords) return;
      const targetZoom = Math.max(map.getZoom(), 14);
      map.flyTo(coords, targetZoom, { duration: 0.6 });
    }, [coords, map]);
    return null;
  }

  function colorForPlace(p) {
    const f = p?.features || {};
    if (f.wheelchair) return "#14b8a6"; // teal
    if (f.braille) return "#8b5cf6"; // violet
    if (f.assistiveAudio) return "#f59e0b"; // amber
    return "#2563eb"; // blue fallback
  }

  function getPinIcon(color) {
    return L.divIcon({
      className: "pin-icon",
      html: `<div class="pin" style="--pin-color: ${color}"></div>`,
      iconSize: [24, 36],
      iconAnchor: [12, 28],
      popupAnchor: [0, -26],
    });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setIsLoginOpen(false);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => { if (user) await (async () => { const { data } = await supabase.from('recent_searches').select('query').eq('user_id', user.id || user.uid).order('created_at', { ascending: false }).limit(6); setRecentSearches((data||[]).map(r=>r.query)); })(); else setRecentSearches([]); })();
  }, [user]);

  return (
    <>
      {/* Top nav overlay */}
<NavBar
  onSignIn={() => setIsLoginOpen(true)}
  onSignOut={handleSignOut}
  onSearch={handleSearch}
  onOpenFilters={() => setIsFiltersOpen((previous) => !previous)}
  onToggleAttractions={() => setIsAttractionsOpen((v) => !v)}
  searchQuery={searchQuery}
  user={user}
  recentSearches={recentSearches}
  isDisabled={isInteractionLocked}
/>

      {/* Global avatar next to nav bar (top-right) */}
      {user && (
        <div className="global-avatar">
          <div className="profile">
            <button
              className="avatar-btn"
              aria-label="Profile"
              onClick={(e) => {
                e.stopPropagation();
                const menu = e.currentTarget.nextElementSibling;
                if (menu) menu.classList.toggle("is-open");
              }}
            >
              <img
                src={user?.user_metadata?.avatar_url || user?.avatar_url || avatarDefault}
                alt=""
                className="avatar-img"
              />
            </button>
            <div className="profile-menu" role="menu" onClick={(e)=>e.stopPropagation()}>
              <button className="profile-menu__item" onClick={() => setIsPasswordOpen(true)}>Change password</button>
              <button
                className="profile-menu__item"
                onClick={async () => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = async (ev) => {
                    const file = ev.target.files?.[0];
                    if (!file) return;
                    const ext = file.name.split(".").pop();
                    const path = `${user.id || user.uid}/${Date.now()}.${ext}`;
                    const { data: up, error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
                    if (!error && up?.path) {
                      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(up.path);
                      await supabase.auth.updateUser({ data: { avatar_url: publicUrl.publicUrl } });
                      const { data: sess } = await supabase.auth.getSession();
                      setUser(sess.session?.user ?? null);
                    }
                  };
                  input.click();
                }}
              >
                Upload photo
              </button>
              <button className="profile-menu__item" onClick={handleSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      )}

      <div className={`interaction-scrim ${isInteractionLocked ? "is-visible" : ""}`} aria-hidden="true" />

      {/* Full-screen map background layer */}
      <div className="map-bg" aria-hidden={false}>
        <MapContainer
          center={[43.6532, -79.3832]}
          zoom={13}
          scrollWheelZoom={!isInteractionLocked}
          dragging={!isInteractionLocked}
          doubleClickZoom={!isInteractionLocked}
          keyboard={!isInteractionLocked}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <ScaleControl position="bottomleft" />
          <ZoomControl position="bottomright" />
          {filteredPlaces.map((place) => {
            const color = colorForPlace(place);
            const position = [place.lat, place.lng];
            return (
              <Marker
                key={place.id}
                position={position}
                icon={getPinIcon(color)}
                eventHandlers={{ click: () => setSelectedPlace(place) }}
              >
                <Popup>
                  <strong>{place.name}</strong>
                  <br />
                  Accessibility: {place.rating}/5
                </Popup>
              </Marker>
            );
          })}
          <FlyToSelected coords={selectedPlace ? [selectedPlace.lat, selectedPlace.lng] : null} />
        </MapContainer>
      </div>

      {/* Overlay widgets */}
      <img className="corner-logo" src={logo} alt="Accessible Travel Finder" />
      <div className="app-shell">
        <div className={`app-shell__content ${isInteractionLocked ? "is-blocked" : ""}`} {...inertProps}>
          {/* Places list (right side panel) */}
          {isAttractionsOpen && (
            <div className="overlay-panel">
              <div className="overlay-header">
                <span className="overlay-title">Top Results</span>
              </div>
              <div className="overlay-panel__body">
                <PlaceList
                  places={filteredPlaces}
                  selectedPlaceId={selectedPlace?.id}
                  onSelect={setSelectedPlace}
                />
              </div>
            </div>
          )}

          <button className="fab" onClick={() => setIsModalOpen(true)}>+ Review</button>
        </div>

        <FiltersModal
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          filters={filters}
          onChange={setFilters}
        />
        <AddReviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitReview}
          placeName={selectedPlace?.name}
        />
        <ChangePasswordModal
          isOpen={isPasswordOpen}
          onClose={() => setIsPasswordOpen(false)}
          onSubmit={async (pwd) => { await supabase.auth.updateUser({ password: pwd }); }}
        />
        {isLoginOpen && (
          <LoginScreen
            onClose={() => setIsLoginOpen(false)}
            onSuccess={(authUser) => {
              setUser(authUser);
              setIsLoginOpen(false);
            }}
          />
        )}
      </div>
    </>
  );
}

export default App;





