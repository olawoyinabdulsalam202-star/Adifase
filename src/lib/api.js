// Backend integration point.
// Set VITE_API_BASE_URL in .env once the real backend exists, e.g.
// VITE_API_BASE_URL=https://api.adifase97.org
// Every function in src/lib/db.js is written to mirror a REST call
// (getRoles, addVoter, castVote, etc). Replace the localStorage logic
// inside each function with a fetch() to `${API_BASE_URL}/...` and the
// rest of the app keeps working unchanged.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const USE_BACKEND = Boolean(API_BASE_URL);
