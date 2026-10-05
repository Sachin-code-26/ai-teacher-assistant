// =============================================================
//  server/utils/responseHelper.js
//
//  Utility functions for consistent API responses.
//
//  Why this matters:
//  Without this, every controller would format responses
//  differently. By centralizing it here, every success or
//  error response has the same shape, making the frontend's
//  job much easier.
//
//  Usage in a controller:
//    return sendSuccess(res, 200, "Assignment created", { assignment });
//    return sendError(res, 404, "Assignment not found");
// =============================================================

/**
 * Send a standardized success response.
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (200, 201, etc.)
 * @param {string} message - Human-readable success message
 * @param {object} data - The actual payload to return
 */
export const sendSuccess = (res, statusCode = 200, message = "Success", data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

/**
 * Send a standardized error response.
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (400, 401, 404, 500, etc.)
 * @param {string} message - Human-readable error message
 */
export const sendError = (res, statusCode = 500, message = "Something went wrong") => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
