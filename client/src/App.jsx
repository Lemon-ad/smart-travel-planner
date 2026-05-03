import { useEffect, useMemo, useRef, useState } from "react";
import { City, Country, State } from "country-state-city";
import {
  createTrip,
  deleteTrip,
  fetchTripOverview,
  fetchTrips,
  getCurrentUser,
  loginUser,
  registerUser,
  updateTrip
} from "./lib/api";

const emptyAuthForm = {
  name: "",
  email: "",
  password: ""
};

const emptyTripForm = {
  title: "",
  destinationState: "",
  destinationCity: "",
  destinationCountry: "",
  notes: "",
  category: "Leisure",
  preferredWeather: "",
  dietaryPreference: "",
  interests: "",
  startDate: "",
  endDate: "",
  budget: ""
};

const featureCards = [
  {
    icon: "pin",
    title: "Trip Management",
    description:
      "Create, organize and update travel itineraries with destinations, dates, and personal notes."
  },
  {
    icon: "cloud",
    title: "Live Weather Sync",
    description:
      "Real-time forecasts via OpenWeatherMap, plus smart packing lists tailored to conditions."
  },
  {
    icon: "spark",
    title: "Smart Preferences",
    description:
      "Save dietary needs, favourite categories and weather to personalise every trip."
  },
  {
    icon: "calendar",
    title: "Daily Breakdown",
    description: "An overview of trip duration with day-by-day planning for every destination."
  },
  {
    icon: "shield",
    title: "JWT Authentication",
    description: "Secure session management with hashed credentials and protected private routes."
  },
  {
    icon: "lock",
    title: "Your Data, Yours",
    description: "Row-level style ownership means users only access and edit their own travel records."
  }
];

function AppLogo({ compact = false }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <div className="brand-mark">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <span>Smart Travel Planner</span>
    </div>
  );
}

function Icon({ name }) {
  const icons = {
    pin: (
      <path
        d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    cloud: (
      <path
        d="M7 18h9a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 6 9.5 3.5 3.5 0 0 0 7 18Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    spark: (
      <path
        d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Zm7 12 .6 2 .4.6.6.4-2 .6-.6.4-.4.6-.6-2-.4-.6-.6-.4 2-.6.6-.4.4-.6ZM5 14l.8 2.7L8.5 18l-2.7.8L5 21l-.8-2.2L1.5 18l2.7-1.3L5 14Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    calendar: (
      <path
        d="M7 2v4M17 2v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    shield: (
      <path
        d="M12 3 5 6v6c0 4.2 2.8 8.1 7 9 4.2-.9 7-4.8 7-9V6l-7-3Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    lock: (
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    auth: (
      <path
        d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"
        fill="currentColor"
      />
    ),
    logout: (
      <path
        d="M14 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3M10 12h11m0 0-3-3m3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    )
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function SearchableSelect({
  label,
  name,
  value,
  options,
  placeholder,
  onSelect,
  disabled = false
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  return (
    <label className="searchable-select-label">
      {label}
      <div className={`searchable-select ${disabled ? "disabled" : ""}`} ref={containerRef}>
        <input name={name} type="hidden" value={value} />
        <button
          className={`searchable-trigger ${open ? "open" : ""}`}
          disabled={disabled}
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <span>{value || placeholder}</span>
          <span className="searchable-caret">▾</span>
        </button>

        {open && !disabled && (
          <div className="searchable-menu">
            <input
              autoFocus
              className="searchable-input"
              placeholder={`Search ${label.toLowerCase()}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <div className="searchable-options">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    className="searchable-option"
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onSelect(option);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="searchable-empty">No results found.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}

function formatTripForForm(trip) {
  return {
    title: trip.title || "",
    destinationState: trip.destination?.state || "",
    destinationCity: trip.destination?.city || "",
    destinationCountry: trip.destination?.country || "",
    notes: trip.notes || "",
    category: trip.category || "Leisure",
    preferredWeather: trip.preferences?.weather || "",
    dietaryPreference: trip.preferences?.dietary || "",
    interests: (trip.preferences?.interests || []).join(", "),
    startDate: trip.startDate || "",
    endDate: trip.endDate || "",
    budget: trip.budget || ""
  };
}

function toLocalStorage(token, user) {
  localStorage.setItem("smart-travel-token", token);
  localStorage.setItem("smart-travel-user", JSON.stringify(user));
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [publicView, setPublicView] = useState("landing");
  const [memberView, setMemberView] = useState("dashboard");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [tripForm, setTripForm] = useState(emptyTripForm);
  const [token, setToken] = useState(localStorage.getItem("smart-travel-token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("smart-travel-user");
    return saved ? JSON.parse(saved) : null;
  });
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [overview, setOverview] = useState(null);
  const [editingTripId, setEditingTripId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedStateCode, setSelectedStateCode] = useState("");

  const countryOptions = useMemo(
    () =>
      Country.getAllCountries()
        .map((country) => ({
          label: country.name,
          value: country.isoCode
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    []
  );

  const cityOptions = useMemo(() => {
    if (!selectedCountryCode) {
      return [];
    }

    const sourceCities = selectedStateCode
      ? City.getCitiesOfState(selectedCountryCode, selectedStateCode)
      : City.getCitiesOfCountry(selectedCountryCode);
    const uniqueCities = new Map();

    sourceCities.forEach((city) => {
      if (!uniqueCities.has(city.name)) {
        uniqueCities.set(city.name, {
          label: city.name,
          value: city.name
        });
      }
    });

    return Array.from(uniqueCities.values()).sort((left, right) =>
      left.label.localeCompare(right.label)
    );
  }, [selectedCountryCode, selectedStateCode]);

  const stateOptions = useMemo(() => {
    if (!selectedCountryCode) {
      return [];
    }

    return State.getStatesOfCountry(selectedCountryCode)
      .map((state) => ({
        label: state.name,
        value: state.isoCode
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [selectedCountryCode]);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function bootstrap() {
      try {
        const [{ user: currentUser }, { trips: loadedTrips }] = await Promise.all([
          getCurrentUser(token),
          fetchTrips(token)
        ]);
        setUser(currentUser);
        setTrips(loadedTrips);
      } catch (bootstrapError) {
        handleLogout();
        setError(bootstrapError.message);
      }
    }

    bootstrap();
  }, [token]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!tripForm.destinationCountry) {
      setSelectedCountryCode("");
      return;
    }

    const matchedCountry = countryOptions.find(
      (country) => country.label === tripForm.destinationCountry
    );

    setSelectedCountryCode(matchedCountry?.value || "");
  }, [countryOptions, tripForm.destinationCountry]);

  useEffect(() => {
    if (!tripForm.destinationState || stateOptions.length === 0) {
      setSelectedStateCode("");
      return;
    }

    const matchedState = stateOptions.find((state) => state.label === tripForm.destinationState);
    setSelectedStateCode(matchedState?.value || "");
  }, [stateOptions, tripForm.destinationState]);

  function openAuth(nextMode = "login") {
    setMode(nextMode);
    setPublicView("auth");
    setError("");
    setMessage("");
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const action = mode === "register" ? registerUser : loginUser;
      const payload =
        mode === "register" ? authForm : { email: authForm.email, password: authForm.password };
      const data = await action(payload);

      setToken(data.token);
      setUser(data.user);
      setMemberView("dashboard");
      toLocalStorage(data.token, data.user);
      setAuthForm(emptyAuthForm);
      setMessage(mode === "register" ? "Account created." : "Welcome back.");
    } catch (authError) {
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshTrips(nextSelectedTripId = "") {
    const { trips: loadedTrips } = await fetchTrips(token);
    setTrips(loadedTrips);

    if (nextSelectedTripId) {
      setSelectedTripId(nextSelectedTripId);
    } else if (loadedTrips.length === 0) {
      setSelectedTripId("");
      setOverview(null);
    }
  }

  async function handleTripSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData(event.currentTarget);
      const readField = (name, fallback = "") =>
        String(formData.get(name) || fallback || "").trim();

      const payload = {
        title: readField("title", tripForm.title),
        destinationCity: readField("destinationCity", tripForm.destinationCity),
        destinationState: readField("destinationState", tripForm.destinationState),
        destinationCountry: readField("destinationCountry", tripForm.destinationCountry),
        notes: readField("notes", tripForm.notes),
        category: readField("category", tripForm.category),
        preferredWeather: readField("preferredWeather", tripForm.preferredWeather),
        dietaryPreference: readField("dietaryPreference", tripForm.dietaryPreference),
        interests: readField("interests", tripForm.interests),
        startDate: readField("startDate", tripForm.startDate),
        endDate: readField("endDate", tripForm.endDate),
        budget: readField("budget", tripForm.budget)
      };

      let tripId = editingTripId;

      if (editingTripId) {
        await updateTrip(token, editingTripId, payload);
        setMessage("Trip updated successfully.");
      } else {
        const response = await createTrip(token, payload);
        tripId = response.trip._id;
        setMessage("Trip created successfully.");
      }

      await refreshTrips(tripId);
      setTripForm(emptyTripForm);
      setEditingTripId("");
      setSelectedCountryCode("");
      setSelectedStateCode("");

      if (tripId) {
        const data = await fetchTripOverview(token, tripId);
        setSelectedTripId(tripId);
        setOverview(data);
      }
    } catch (tripError) {
      setError(tripError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTrip(tripId) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await deleteTrip(token, tripId);
      setMessage("Trip deleted successfully.");
      if (selectedTripId === tripId) {
        setSelectedTripId("");
        setOverview(null);
      }
      await refreshTrips();
    } catch (tripError) {
      setError(tripError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectTrip(tripId) {
    setSelectedTripId(tripId);
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await fetchTripOverview(token, tripId);
      setOverview(data);
    } catch (overviewError) {
      setError(overviewError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditTrip(trip) {
    setEditingTripId(trip._id);
    setTripForm(formatTripForForm(trip));
    setSelectedCountryCode(
      countryOptions.find((country) => country.label === trip.destination.country)?.value || ""
    );
    setSelectedStateCode(
      stateOptions.find((state) => state.label === (trip.destination.state || ""))?.value || ""
    );
    setMessage("Editing trip.");
    setError("");
  }

  function handleLogout() {
    localStorage.removeItem("smart-travel-token");
    localStorage.removeItem("smart-travel-user");
    setToken("");
    setUser(null);
    setTrips([]);
    setSelectedTripId("");
    setOverview(null);
    setEditingTripId("");
    setPublicView("landing");
    setMode("login");
    setMemberView("dashboard");
  }

  function renderFeatureCards() {
    return (
      <section className="feature-section">
        <div className="section-copy">
          <h2>Everything you need for a perfect trip</h2>
          <p>Self-developed CRUD API + third-party integrations, all behind secure authentication.</p>
        </div>

        <div className="feature-grid">
          {featureCards.map((card) => (
            <article className="soft-card feature-card" key={card.title}>
              <div className="feature-icon">
                <Icon name={card.icon} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderFloatingStatus() {
    if (!error && !message) {
      return null;
    }

    const statusType = error ? "error" : "success";
    const content = error || message;

    return <div className={`floating-status status ${statusType}`}>{content}</div>;
  }

  function renderLandingPage() {
    return (
      <div className="public-page">
        <header className="site-header fixed-header">
          <div className="header-inner">
            <AppLogo />
            <div className="header-actions">
              <button className="nav-link-button" type="button" onClick={() => openAuth("login")}>
                Sign in
              </button>
              <button className="cta-button" type="button" onClick={() => openAuth("register")}>
                Get started
              </button>
            </div>
          </div>
        </header>

        <main className="landing-shell">
          {renderFloatingStatus()}
          <section className="hero-section">
            <div className="pill-badge">6003CEM · SMART TRAVEL PLANNER</div>
            <h1>
              Build a travel journal that <span>thinks ahead.</span>
            </h1>
            <p>
              Save your destinations, blend in real-time weather and nearby attractions, and turn a
              plain itinerary into a smarter travel plan.
            </p>
            <div className="hero-actions">
              <button className="cta-button large" type="button" onClick={() => openAuth("register")}>
                Start planning free
              </button>
              <button
                className="ghost-button large"
                type="button"
                onClick={() => {
                  if (token && user) {
                    setMemberView("dashboard");
                  } else {
                    openAuth("login");
                  }
                }}
              >
                View dashboard
              </button>
            </div>
          </section>

          {renderFeatureCards()}

          <section className="cta-panel">
            <h2>Ready to plan your next adventure?</h2>
            <p>Sign in and start tracking your trips with live weather intelligence.</p>
            <button className="cta-button large" type="button" onClick={() => openAuth("register")}>
              Get started — it&apos;s free
            </button>
          </section>

          <footer className="site-footer">
            <p>Built for 6003CEM · Smart Travel Planner Group Project</p>
          </footer>
        </main>
      </div>
    );
  }

  function renderAuthScreen() {
    return (
      <div className="public-page">
        <header className="site-header fixed-header">
          <div className="header-inner">
            <AppLogo />
            <div className="header-actions">
              <button className="nav-link-button" type="button" onClick={() => openAuth("login")}>
                Sign in
              </button>
              <button className="cta-button" type="button" onClick={() => openAuth("register")}>
                Get started
              </button>
            </div>
          </div>
        </header>

        <main className="auth-page-shell">
          {renderFloatingStatus()}
          <section className="auth-card soft-card">
            <div className="auth-card-icon">
              <Icon name="auth" />
            </div>
            <h1>Welcome</h1>
            <p>Sign in or create an account to start planning</p>

            <div className="auth-switch">
              <button
                className={mode === "login" ? "active" : ""}
                type="button"
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                type="button"
                onClick={() => setMode("register")}
              >
                Sign up
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {mode === "register" && (
                <label>
                  Display name
                  <input
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                    placeholder="Jane Doe"
                    required
                  />
                </label>
              )}

              <label>
                Email
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  required
                />
              </label>

              <button className="cta-button auth-submit" disabled={loading} type="submit">
                {loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
              </button>
            </form>
          </section>

        </main>
      </div>
    );
  }

  function renderTripCards() {
    if (trips.length === 0) {
      return <p className="empty-state">No trips yet. Create your first plan on the left.</p>;
    }

    return trips.map((trip) => (
      <article
        className={`trip-card ${selectedTripId === trip._id ? "selected" : ""}`}
        key={trip._id}
      >
        <button className="trip-select" type="button" onClick={() => handleSelectTrip(trip._id)}>
          <div>
            <strong>{trip.title}</strong>
            <p>
              {trip.destination.city}
              {trip.destination.state ? `, ${trip.destination.state}` : ""}
              {`, ${trip.destination.country}`}
            </p>
          </div>
          <span>{trip.category}</span>
        </button>

        <p className="trip-notes">{trip.notes || "No notes added yet."}</p>

        <div className="trip-card-actions">
          <button type="button" onClick={() => handleEditTrip(trip)}>
            Edit
          </button>
          <button type="button" onClick={() => handleDeleteTrip(trip._id)}>
            Delete
          </button>
        </div>
      </article>
    ));
  }

  function renderInsightsPanel() {
    if (!overview) {
      return (
        <section className="soft-card insights-panel empty-insight">
          <h2>
            <span className="spark-inline">✣</span> Smart Insights
          </h2>
          <p>Select a trip to load weather, attractions, and smart travel suggestions.</p>
        </section>
      );
    }

    return (
      <section className="soft-card insights-panel">
        <h2>
          <span className="spark-inline">✣</span> Smart Insights
        </h2>

          <div className="insight-grid">
          <article className="mini-insight">
            <p className="mini-label">Weather</p>
            <h3>{overview.weather.location}</h3>
            <p>
              {overview.weather.temperature}°C · {overview.weather.description}
            </p>
            <p>Feels like {overview.weather.feelsLike}°C</p>
            <p>Wind: {overview.weather.windSpeed} m/s</p>
          </article>

          <article className="mini-insight">
            <p className="mini-label">Trip Summary</p>
            <h3>{overview.summary.tripDuration} day(s)</h3>
            <p>{overview.summary.smartVisitAdvice}</p>
            <p>Budget: RM {overview.trip.budget}</p>
          </article>

          <article className="mini-insight wide">
            <p className="mini-label">Saved Preferences</p>
            <ul className="chip-list">
              {overview.trip.preferences.weather && <li>{overview.trip.preferences.weather}</li>}
              {overview.trip.preferences.dietary && <li>{overview.trip.preferences.dietary}</li>}
              {overview.trip.preferences.interests.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {!overview.trip.preferences.weather &&
                !overview.trip.preferences.dietary &&
                overview.trip.preferences.interests.length === 0 && <li>No preferences saved yet</li>}
            </ul>
          </article>

          <article className="mini-insight wide">
            <p className="mini-label">Packing List</p>
            <ul className="chip-list">
              {overview.packingList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="mini-insight wide">
            <p className="mini-label">Nearby Attractions</p>
            <div className="attraction-list">
              {overview.attractions.length > 0 ? (
                overview.attractions.map((place) => (
                  <div className="place-row" key={place.id}>
                    <strong>{place.name}</strong>
                    <span>{place.category}</span>
                    <p>{place.address}</p>
                  </div>
                ))
              ) : (
                <p>No attraction results available.</p>
              )}
            </div>
          </article>

          <article className="mini-insight wide">
            <p className="mini-label">Daily Breakdown</p>
            <div className="attraction-list">
              {overview.dailyBreakdown.map((day) => (
                <div className="place-row" key={day.day}>
                  <strong>
                    Day {day.day} · {day.date}
                  </strong>
                  <span>{day.focus}</span>
                  <p>{day.note}</p>
                  <p>{day.weatherTip}</p>
                </div>
              ))}
            </div>
          </article>

          {overview.aiInsights && (
            <article className="mini-insight wide">
              <p className="mini-label">Gemini Smart Planner</p>
              <h3>{overview.aiInsights.headline}</h3>
              <p>{overview.aiInsights.summary}</p>
              {overview.aiInsights.timingTip && <p>Timing: {overview.aiInsights.timingTip}</p>}
              {overview.aiInsights.foodTip && <p>Food: {overview.aiInsights.foodTip}</p>}
              {overview.aiInsights.highlights?.length > 0 && (
                <ul className="chip-list">
                  {overview.aiInsights.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </article>
          )}
        </div>
      </section>
    );
  }

  function renderDashboard() {
    return (
      <section className="member-body">
        {renderFloatingStatus()}
        <div className="member-hero">
          <h1>Welcome, {user.name}</h1>
          <p>Plan a trip on the left, then select it to see live weather and smart suggestions.</p>
        </div>

        <div className="dashboard-grid">
          <form className="soft-card planner-card" onSubmit={handleTripSubmit}>
            <div className="card-head">
              <h2>{editingTripId ? "Edit Trip" : "Create Trip"}</h2>
              {editingTripId && (
                <button
                  className="inline-plain-button"
                  type="button"
                  onClick={() => {
                    setEditingTripId("");
                    setTripForm(emptyTripForm);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            <label>
              Title
              <input
                name="title"
                value={tripForm.title}
                onChange={(event) => setTripForm({ ...tripForm, title: event.target.value })}
                placeholder="Summer in Kyoto"
                required
              />
            </label>

            <div className="split-fields">
              <SearchableSelect
                label="Country"
                name="destinationCountry"
                options={countryOptions}
                placeholder="Select country"
                value={tripForm.destinationCountry}
                onSelect={(option) => {
                  setSelectedCountryCode(option.value);
                  setSelectedStateCode("");
                  setTripForm({
                    ...tripForm,
                    destinationCountry: option.label,
                    destinationState: "",
                    destinationCity: ""
                  });
                }}
              />

              <SearchableSelect
                disabled={!selectedCountryCode || stateOptions.length === 0}
                label="State"
                name="destinationState"
                options={stateOptions}
                placeholder={selectedCountryCode ? "Select state" : "Choose country first"}
                value={tripForm.destinationState}
                onSelect={(option) => {
                  setSelectedStateCode(option.value);
                  setTripForm({
                    ...tripForm,
                    destinationState: option.label,
                    destinationCity: ""
                  });
                }}
              />

              <SearchableSelect
                disabled={!selectedCountryCode}
                label="City"
                name="destinationCity"
                options={cityOptions}
                placeholder={
                  selectedCountryCode
                    ? stateOptions.length > 0 && !selectedStateCode
                      ? "Choose state first"
                      : "Select city"
                    : "Choose country first"
                }
                value={tripForm.destinationCity}
                onSelect={(option) =>
                  setTripForm({
                    ...tripForm,
                    destinationCity: option.label
                  })
                }
              />
            </div>

            <div className="split-fields">
              <label>
                Start date
                <input
                  name="startDate"
                  type="date"
                  value={tripForm.startDate}
                  onChange={(event) => setTripForm({ ...tripForm, startDate: event.target.value })}
                  required
                />
              </label>

              <label>
                End date
                <input
                  name="endDate"
                  type="date"
                  value={tripForm.endDate}
                  onChange={(event) => setTripForm({ ...tripForm, endDate: event.target.value })}
                  required
                />
              </label>
            </div>

            <div className="split-fields">
              <label>
                Category
                <select
                  name="category"
                  value={tripForm.category}
                  onChange={(event) => setTripForm({ ...tripForm, category: event.target.value })}
                >
                  <option>Leisure</option>
                  <option>Business</option>
                  <option>Foodie</option>
                  <option>Adventure</option>
                  <option>Family</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Budget (RM)
                <input
                  name="budget"
                  type="number"
                  min="0"
                  value={tripForm.budget}
                  onChange={(event) => setTripForm({ ...tripForm, budget: event.target.value })}
                />
              </label>
            </div>

            <label>
              Notes
              <textarea
                name="notes"
                rows="4"
                value={tripForm.notes}
                onChange={(event) => setTripForm({ ...tripForm, notes: event.target.value })}
              />
            </label>

            <div className="split-fields">
              <label>
                Preferred weather
                <input
                  name="preferredWeather"
                  value={tripForm.preferredWeather}
                  onChange={(event) =>
                    setTripForm({ ...tripForm, preferredWeather: event.target.value })
                  }
                  placeholder="Cool, sunny"
                />
              </label>

              <label>
                Dietary preference
                <input
                  name="dietaryPreference"
                  value={tripForm.dietaryPreference}
                  onChange={(event) =>
                    setTripForm({ ...tripForm, dietaryPreference: event.target.value })
                  }
                  placeholder="Halal, vegetarian"
                />
              </label>
            </div>

            <label>
              Interests
              <input
                name="interests"
                value={tripForm.interests}
                onChange={(event) => setTripForm({ ...tripForm, interests: event.target.value })}
                placeholder="museum, cafe, park"
              />
            </label>

            <button className="cta-button auth-submit" disabled={loading} type="submit">
              {loading ? "Saving..." : editingTripId ? "Update trip" : "Save trip"}
            </button>
          </form>

          <div className="dashboard-panels">
            <section className="soft-card list-panel">
              <div className="card-head">
                <h2>Your Trips</h2>
                <span>{trips.length} saved</span>
              </div>
              <div className="trip-list">{renderTripCards()}</div>
            </section>

            {renderInsightsPanel()}
          </div>
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <section className="member-body">
        <div className="member-hero">
          <h1>Profile</h1>
          <p>Review your account details and project progress at a glance.</p>
        </div>

        <div className="profile-grid">
          <section className="soft-card profile-panel">
            <h2>Account details</h2>
            <div className="profile-stack">
              <div>
                <span>Name</span>
                <strong>{user.name}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{user.role}</strong>
              </div>
            </div>
          </section>

          <section className="soft-card profile-panel">
            <h2>Travel summary</h2>
            <div className="stat-grid">
              <article>
                <span>Trips saved</span>
                <strong>{trips.length}</strong>
              </article>
              <article>
                <span>Selected plan</span>
                <strong>{selectedTripId ? "1 active" : "None"}</strong>
              </article>
            </div>
          </section>

          <section className="soft-card profile-panel wide">
            <h2>Security and integrations</h2>
            <ul className="profile-points">
              <li>JWT-based sign-in is active for your account session.</li>
              <li>Trips are stored in MongoDB Atlas under your user record.</li>
              <li>Weather data comes from OpenWeatherMap.</li>
              <li>Nearby attractions come from Foursquare Places.</li>
            </ul>
          </section>
        </div>
      </section>
    );
  }

  if (!token || !user) {
    return publicView === "landing" ? renderLandingPage() : renderAuthScreen();
  }

  return (
    <div className="member-page">
      <header className="site-header fixed-header">
        <div className="header-inner">
          <AppLogo />

          <div className="member-nav">
            <button
              className={`nav-link-button ${memberView === "dashboard" ? "active" : ""}`}
              type="button"
              onClick={() => setMemberView("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`nav-link-button ${memberView === "profile" ? "active" : ""}`}
              type="button"
              onClick={() => setMemberView("profile")}
            >
              Profile
            </button>
            <button className="outline-button" type="button" onClick={handleLogout}>
              <Icon name="logout" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="member-shell">
        {memberView === "dashboard" ? renderDashboard() : renderProfile()}
      </main>
    </div>
  );
}
