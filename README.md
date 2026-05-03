# Smart Travel Planner

Smart Travel Planner is a coursework project for `6003CEM Web API Development`.

## Stack

- Frontend: `React + Vite`
- Backend: `Node.js + Express`
- Database: `MongoDB`
- Authentication: `JWT`
- Third-party APIs: `OpenWeatherMap` and `Foursquare`

## Implemented Features

- User registration and login
- JWT-protected backend routes
- Trip CRUD for each authenticated user
- Smart overview endpoint that combines:
  - stored travel data
  - live weather data
  - nearby attractions
  - packing suggestions
- React dashboard for authentication, trip management, and smart insights

## Folder Structure

- `client` contains the React application
- `server` contains the Express API

## Environment Setup

1. Copy `server/.env.example` to `server/.env`
2. Copy `client/.env.example` to `client/.env`
3. Fill in:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `OPENWEATHER_API_KEY`
   - `FOURSQUARE_API_KEY`

## What The Keys Are For

- `MONGODB_URI`
  - This is the database connection string for your MongoDB Atlas cloud database.
- `JWT_SECRET`
  - This is the private secret used by your backend to sign and verify JWT login tokens.
- `OPENWEATHER_API_KEY`
  - This lets your app fetch live weather data for the travel destination.
- `FOURSQUARE_API_KEY`
  - This lets your app fetch nearby attractions and places.

## How This Matches The Coursework

- The coursework does **not** mean you must invent your own API key system.
- Your **self-developed API** means the API you built yourself in Express:
  - auth routes
  - trip CRUD routes
  - smart overview routes
- The third-party API keys are only credentials that let your app access external services.
- So the coursework expects both:
  - your own API and business logic
  - at least one third-party API integration

## JWT Requirement

- JWT is a good fit for this coursework.
- The brief says authentication with JWT is optional in the minimum requirements, but the marking rubric rewards proper JWT authentication and stronger security.
- Your current `JWT_SECRET` is long and suitable for HS256 signing.
- Keep it in `.env` and never hard-code it into frontend code.

## Run The Project

Backend:

```bash
npm run dev:server
```

Frontend:

```bash
npm run dev:client
```

## MongoDB Atlas Note

- This project is now configured to use MongoDB Atlas instead of a local MongoDB server.
- Because of that, you do **not** need to run `mongod`.
- Your Atlas project must allow your current IP address under Network Access, otherwise the backend cannot connect.

## Main API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/trips`
- `GET /api/trips`
- `GET /api/trips/:id`
- `PUT /api/trips/:id`
- `DELETE /api/trips/:id`
- `GET /api/trips/:id/weather`
- `GET /api/trips/:id/attractions`
- `GET /api/trips/:id/packing-list`
- `GET /api/trips/:id/overview`

## Verification

- Frontend production build completed successfully with `npm run build --workspace client`
- Server import check passed
