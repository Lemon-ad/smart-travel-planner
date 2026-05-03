const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

async function request(path, options = {}) {
  let response;
  const { headers: optionHeaders = {}, ...restOptions } = options;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        ...optionHeaders
      }
    });
  } catch (_error) {
    throw new Error("Cannot connect to the server. Please check that the backend is running.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function registerUser(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getCurrentUser(token) {
  return request("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function fetchTrips(token) {
  return request("/trips", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createTrip(token, payload) {
  return request("/trips", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function updateTrip(token, tripId, payload) {
  return request(`/trips/${tripId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function deleteTrip(token, tripId) {
  return request(`/trips/${tripId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function fetchTripOverview(token, tripId) {
  return request(`/trips/${tripId}/overview`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
