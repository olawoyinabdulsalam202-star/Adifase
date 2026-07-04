// Session-related constants shared by auth.js and db.js.
// Pulled into its own file so those two modules don't import each other.

export const sessionKeys = {
  session: "adifase_session",
  adminSession: "adifase_admin_session",
};

export const SESSION_TTL = 1000 * 60 * 60 * 4; // 4 hours