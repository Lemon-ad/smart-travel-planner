# Smart Travel Planner Checklist

## 1. Dates

- `Cw1` Individual Report due: `18/05/2026, 11:59 PM Malaysian time`
- `Cw2` Group Project due: `15/06/2026, 11:59 PM Malaysian time`

## 2. What To Submit For Cw2

- `Video link` showing and explaining all system functions
- `GitHub link` with accessible repository history
- `Report` in PDF, maximum `2000 words`
- `Face-to-face demonstration` with testing shown live

## 3. GitHub Expectations

- Self-developed API source code must be in GitHub
- Application layer source code must be in GitHub
- Third-party API integration evidence must be in GitHub
- Repository must show real development activity:
  - branches
  - commits
  - pull requests
  - merged pull requests

## 4. Required Tech Stack

- Frontend: `React` or `Angular` or `Vue` or `HTML/CSS/JS`
- Backend: `Node.js + Express`
- Database: choose one of `MongoDB`, `MySQL`, `PostgreSQL`, `SQLite`

## 5. Mandatory System Parts

### A. Self-Developed API

- RESTful API
- CRUD for travel data
- Database persistence
- JSON request/response

### B. Third-Party API Integration

- At least one external API
- Real-time data fetching
- Error handling for invalid key, rate limit, network failure
- Results parsed and shown meaningfully

### C. Application Layer

- Accept user input
- Combine your own API data with third-party API data
- Display results clearly
- Can be:
  - web interface
  - backend-only service tested in Postman

## 6. Submission Report Contents

- System architecture
- API description
- Screenshots or test results
- Challenges and limitations
- AI usage acknowledgement if any AI tools were used

## 7. Core Build Checklist

### 7.1 Project Setup

- [ ] Decide frontend stack
- [ ] Decide database
- [ ] Create GitHub repo
- [ ] Set up branch workflow
- [ ] Add `.env` handling
- [ ] Do not hard-code API keys

### 7.2 Authentication And User Management

- [ ] User registration
- [ ] User login
- [ ] Password hashing
- [ ] JWT generation
- [ ] JWT-protected routes
- [ ] User logout handling on frontend
- [ ] Role support if implementing admin/user

### 7.3 Self-Developed API: Travel Journal

- [ ] Create trip
- [ ] Get all trips for logged-in user
- [ ] Get single trip by id
- [ ] Update trip
- [ ] Delete trip
- [ ] Persist trips in database
- [ ] Validate request body
- [ ] Return clean JSON responses

### 7.4 Trip Data Fields

- [ ] Destination
- [ ] Notes
- [ ] Category
- [ ] Preferences
- [ ] Travel date or visit date
- [ ] Created by user id

## 8. Function Checklist

### 8.1 Backend Functions We Should Have

- [ ] `registerUser`
  - Create new user account
- [ ] `loginUser`
  - Verify credentials and return JWT
- [ ] `hashPassword`
  - Securely hash user password before saving
- [ ] `comparePassword`
  - Check login password against stored hash
- [ ] `generateToken`
  - Create JWT for authenticated user
- [ ] `authenticateToken`
  - Protect private routes
- [ ] `authorizeRole`
  - Restrict routes by role if we add admin/user
- [ ] `createTrip`
  - Save a new trip record
- [ ] `getTrips`
  - Return all trips belonging to current user
- [ ] `getTripById`
  - Return one trip by id
- [ ] `updateTrip`
  - Edit existing trip data
- [ ] `deleteTrip`
  - Remove trip by id
- [ ] `validateTripInput`
  - Check required fields and valid values
- [ ] `getWeatherForTrip`
  - Fetch weather data for the selected destination
- [ ] `getNearbyAttractions`
  - Fetch nearby places from Google Places or Foursquare
- [ ] `buildPackingSuggestion`
  - Convert weather data into packing tips
- [ ] `buildTripOverview`
  - Merge trip data and third-party data into one response
- [ ] `handleApiError`
  - Centralize external API and server error formatting

### 8.2 Frontend Functions We Should Have

- [ ] `handleRegisterSubmit`
  - Send registration form data to backend
- [ ] `handleLoginSubmit`
  - Log user in and store token
- [ ] `fetchTrips`
  - Load user trips from backend
- [ ] `handleCreateTrip`
  - Submit new trip form
- [ ] `handleEditTrip`
  - Update an existing trip
- [ ] `handleDeleteTrip`
  - Delete selected trip
- [ ] `fetchTripInsights`
  - Load combined weather/places/smart info
- [ ] `renderTripCard`
  - Show trip details clearly
- [ ] `renderWeatherSection`
  - Show weather result
- [ ] `renderAttractionsSection`
  - Show nearby attractions
- [ ] `handleErrorDisplay`
  - Show API/network/validation errors to user

## 9. Suggested API Endpoints

### 9.1 Auth

- [ ] `POST /api/auth/register`
- [ ] `POST /api/auth/login`
- [ ] `GET /api/auth/me`

### 9.2 Trips

- [ ] `POST /api/trips`
- [ ] `GET /api/trips`
- [ ] `GET /api/trips/:id`
- [ ] `PUT /api/trips/:id`
- [ ] `DELETE /api/trips/:id`

### 9.3 Smart Features

- [ ] `GET /api/trips/:id/weather`
- [ ] `GET /api/trips/:id/attractions`
- [ ] `GET /api/trips/:id/overview`
- [ ] `GET /api/trips/:id/packing-list`

## 10. Smart Features From The Project PDF

- [ ] Weather-adjusted packing list
- [ ] Nearby discovery using Google Places or Foursquare
- [ ] Smart time-to-visit check
- [ ] Smart calendar or trip duration breakdown
- [ ] Optional group or collaborative trip planning

## 11. Error Handling Checklist

- [ ] Invalid input returns proper `400`
- [ ] Unauthorized access returns `401`
- [ ] Forbidden access returns `403`
- [ ] Missing record returns `404`
- [ ] Server errors return `500`
- [ ] Invalid external API key handled cleanly
- [ ] Rate limit handled cleanly
- [ ] Network failure handled cleanly

## 12. Security Checklist

- [ ] Passwords hashed
- [ ] JWT auth implemented
- [ ] API keys stored in `.env`
- [ ] Sensitive fields not exposed in responses
- [ ] Input validation
- [ ] CORS configured
- [ ] Optional rate limiting
- [ ] Optional secure headers
- [ ] Optional RBAC

## 13. Database Checklist

- [ ] Users collection/table
- [ ] Trips collection/table
- [ ] Relationship between user and trips
- [ ] Schema fields are clear and normalized enough
- [ ] Query only current user's data

## 14. Testing Checklist

- [ ] Test register endpoint
- [ ] Test login endpoint
- [ ] Test protected route without token
- [ ] Test create trip
- [ ] Test get trips
- [ ] Test get single trip
- [ ] Test update trip
- [ ] Test delete trip
- [ ] Test weather integration
- [ ] Test places integration
- [ ] Test invalid API key case
- [ ] Test network failure case
- [ ] Capture screenshots or Postman results

## 15. Higher-Mark Extras

- [ ] MVC or modular folder structure
- [ ] RESTful naming consistency
- [ ] API versioning
- [ ] Centralized error middleware
- [ ] OpenAPI or Swagger docs
- [ ] Automated tests
- [ ] Clean README
- [ ] Good demo flow

## 16. Recommended Minimum Scope

- Authentication with JWT
- CRUD trip manager
- Weather integration
- Nearby attractions integration
- One overview page combining own data + external data
- Postman collection
- Screenshots for report

