// Map raw Supabase/Postgres errors to safe, user-facing messages.
// Avoids leaking table names, constraint names, and RLS policy details to the UI.

type MaybeError = { code?: string; message?: string } | null | undefined;

const CODE_MESSAGES: Record<string, string> = {
  "23505": "This already exists.",
  "23503": "Related item is missing or has been removed.",
  "23502": "Please fill in all required fields.",
  "23514": "Some values are not allowed. Please check and try again.",
  "22P02": "Invalid value provided.",
  "42501": "You do not have permission to perform this action.",
  PGRST301: "You do not have permission to perform this action.",
  PGRST116: "Item not found.",
};

export function friendlyError(err: MaybeError, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  // Log the raw error for developer debugging; do not surface details to users.
  if (typeof console !== "undefined") {
    console.error("[supabase error]", err);
  }
  if (err.code && CODE_MESSAGES[err.code]) return CODE_MESSAGES[err.code];
  const msg = err.message?.toLowerCase() ?? "";
  if (msg.includes("row-level security")) {
    return "You do not have permission to perform this action.";
  }
  if (msg.includes("exceed available stock") || msg.includes("exceeds available stock")) {
    return "One or more items are out of stock. Please update your cart and try again.";
  }
  if (msg.includes("product is not available")) {
    return "This product is no longer available.";
  }
  return fallback;
}

// Auth-specific mapper. Avoids user enumeration by collapsing
// "invalid email/password" and "email not found" into one message.
export function friendlyAuthError(err: MaybeError, fallback = "Could not complete your request. Please try again."): string {
  if (!err) return fallback;
  if (typeof console !== "undefined") {
    console.error("[auth error]", err);
  }
  const msg = err.message?.toLowerCase() ?? "";
  if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("email not confirmed") === false &&
      (msg.includes("user not found") || msg.includes("invalid email or password"))
  ) {
    return "Invalid email or password.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
    // Same generic response for sign-up to prevent enumeration.
    return "If this email is available, your account has been created. Please check your inbox.";
  }
  if (msg.includes("password") && (msg.includes("short") || msg.includes("weak") || msg.includes("at least"))) {
    return "Password is too weak. Use at least 8 characters with a mix of letters and numbers.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network problem. Please check your connection and try again.";
  }
  return fallback;
}
