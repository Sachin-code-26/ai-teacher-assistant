// =============================================================
//  client/src/utils/dateHelpers.js
//  Utility functions for formatting dates across the app.
// =============================================================

/**
 * Format a date into "Sep 15, 2025" style.
 */
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Check if a date is in the past.
 */
export const isOverdue = (dateString) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

/**
 * Return greeting based on current hour.
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};
