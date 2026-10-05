// =============================================================
//  server/utils/jwtHelper.js
//
//  JWT (JSON Web Token) utility functions.
//
//  WHAT IS A JWT?
//  A JWT is a string with 3 parts separated by dots:
//    header.payload.signature
//
//  Example:
//    eyJhbG... . eyJ1c2... . SflKxw...
//    (header)   (payload)   (signature)
//
//  The PAYLOAD contains data we encode into the token:
//    { id: "64abc...", role: "teacher", iat: 1234567890 }
//
//  The SIGNATURE is created using our JWT_SECRET.
//  Only our server knows the secret, so only we can verify tokens.
//
//  IMPORTANT: JWT payloads are BASE64-ENCODED, not encrypted.
//  Anyone can decode the payload — never put sensitive data in it.
//  But they CANNOT forge a valid signature without the secret.
//
//  HOW WE USE IT:
//  1. User logs in → we create a JWT with their id and role
//  2. We store the JWT in an HTTP-only cookie
//  3. On every request, the browser sends the cookie automatically
//  4. Our middleware verifies the JWT → extracts id and role
//  5. We fetch the user from DB and attach to req.user
// =============================================================

import jwt from "jsonwebtoken";

/**
 * Generate a JWT token for a user.
 * @param {string} id      - MongoDB user _id
 * @param {string} role    - "student" | "teacher"
 * @returns {string}       - Signed JWT string
 */
export const generateToken = (id, role) => {
  return jwt.sign(
    // Payload — data encoded inside the token
    { id, role },
    // Secret key — used to sign and verify the token
    process.env.JWT_SECRET,
    // Options
    { expiresIn: "7d" } // Token expires in 7 days
  );
};

/**
 * Set the JWT as an HTTP-only cookie on the response.
 *
 * Why a helper function for this?
 * Cookie settings (httpOnly, secure, sameSite, maxAge) must be
 * consistent everywhere. One function = one place to change them.
 *
 * @param {object} res   - Express response object
 * @param {string} token - JWT string from generateToken()
 */
export const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,   // JS cannot access this cookie (XSS protection)
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "strict", // Prevent CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };

  res.cookie("token", token, cookieOptions);
};

/**
 * Clear the auth cookie (used on logout).
 * @param {object} res - Express response object
 */
export const clearTokenCookie = (res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0), // Set expiry to the past → browser deletes it
  });
};

/**
 * Verify a JWT token and return the decoded payload.
 * @param {string} token - JWT string
 * @returns {{ id: string, role: string }} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
