import { useEffect, useState } from "react";
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
            d="M21 3 10.5 13.5M21 3l-6.2 18-4.4-7.4L3 9.2 21 3ZM10.5 13.5 14 17"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
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
        d="M14 4h4a2 2 0 0 1 2 2v4M10 20H6a2 2 0 0 1-2-2v-4M14 12h7m0 0-3-3m3 3-3 3M10 4H6a2 2 0 0 0-2 2v4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
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

function formatTripForForm(trip) {
  return {
    title: trip.title || "",
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
      let tripId = editingTripId;

      if (editingTripId) {
        await updateTrip(token, editingTripId, tripForm);
        setMessage("Trip updated successfully.");
      } else {
        const response = await createTrip(token, tripForm);
        tripId = response.trip._id;
        setMessage("Trip created successfully.");
      }

      await refreshTrips(tripId);
      setTripForm(emptyTripForm);
      setEditingTripId("");

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

          {error && <p className="status error auth-status">{error}</p>}
          {message && <p className="status success auth-status">{message}</p>}
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
              {trip.destination.city}, {trip.destination.country}
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
          </article>

          <article className="mini-insight">
            <p className="mini-label">Trip Summary</p>
            <h3>{overview.summary.tripDuration} day(s)</h3>
            <p>{overview.summary.smartVisitAdvice}</p>
            <p>Budget: RM {overview.trip.budget}</p>
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
        </div>
      </section>
    );
  }

  function renderDashboard() {
    return (
      <section className="member-body">
        <div className="member-hero">
          <h1>Welcome, {user.name}</h1>
          <p>Plan a trip on the left, then select it to see live weather and smart suggestions.</p>
        </div>

        {error && <p className="status error">{error}</p>}
        {message && <p className="status success">{message}</p>}

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
                value={tripForm.title}
                onChange={(event) => setTripForm({ ...tripForm, title: event.target.value })}
                placeholder="Summer in Kyoto"
                required
              />
            </label>

            <div className="split-fields">
              <label>
                City
                <input
                  value={tripForm.destinationCity}
                  onChange={(event) =>
                    setTripForm({ ...tripForm, destinationCity: event.target.value })
                  }
                  placeholder="Kyoto"
                  required
                />
              </label>

              <label>
                Country
                <input
                  value={tripForm.destinationCountry}
                  onChange={(event) =>
                    setTripForm({ ...tripForm, destinationCountry: event.target.value })
                  }
                  placeholder="Japan"
                  required
                />
              </label>
            </div>

            <div className="split-fields">
              <label>
                Start date
                <input
                  type="date"
                  value={tripForm.startDate}
                  onChange={(event) => setTripForm({ ...tripForm, startDate: event.target.value })}
                  required
                />
              </label>

              <label>
                End date
                <input
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
                rows="4"
                value={tripForm.notes}
                onChange={(event) => setTripForm({ ...tripForm, notes: event.target.value })}
              />
            </label>

            <div className="split-fields">
              <label>
                Preferred weather
                <input
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
