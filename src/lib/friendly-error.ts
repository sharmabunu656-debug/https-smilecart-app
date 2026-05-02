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
  if (err.message?.toLowerCase().includes("row-level security")) {
    return "You do not have permission to perform this action.";
  }
  return fallback;
}
