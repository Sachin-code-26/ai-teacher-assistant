// =============================================================
//  server/models/User.js
//
//  The User model defines what a "user" looks like in MongoDB.
//
//  KEY CONCEPTS:
//
//  Schema  → The blueprint (what fields exist, their types, rules)
//  Model   → The class that lets you create/read/update/delete
//             documents using that schema.
//
//  Think of it like this:
//    Schema = CREATE TABLE users (email VARCHAR, role ENUM...)
//    Model  = The ORM class you query with (User.find(), User.create())
//
//  IMPORTANT SECURITY NOTES:
//  - We never store plain text passwords (bcrypt hashes them)
//  - We use `select: false` on the password field so it is
//    never accidentally returned in queries
//  - Timestamps are added automatically by Mongoose
// =============================================================

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// =============================================================
//  SCHEMA DEFINITION
//  Each key maps to a field in the MongoDB document.
// =============================================================
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,           // Remove leading/trailing spaces
      maxlength: [50, "First name cannot exceed 50 characters"],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,          // No two users can share an email
      lowercase: true,       // Always stored as lowercase
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,         // ← CRITICAL: Never return password in queries by default
                             //   To get it, you must explicitly write .select('+password')
    },

    role: {
      type: String,
      enum: {
        values: ["student", "teacher"],
        message: "Role must be either 'student' or 'teacher'",
      },
      default: "student",
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` fields
    timestamps: true,
  }
);

// =============================================================
//  PRE-SAVE MIDDLEWARE (Mongoose Hook)
//
//  This function runs AUTOMATICALLY every time we call .save()
//  on a User document — BEFORE it writes to MongoDB.
//
//  We use it to hash the password so plain text is NEVER stored.
//
//  `this` refers to the user document being saved.
//
//  The isModified check is important:
//  If a teacher updates their name, we don't want to re-hash
//  the password unnecessarily. Only hash if password changed.
// =============================================================
userSchema.pre("save", async function () {
  // Only run if the password field was actually modified
  if (!this.isModified("password")) return;

  // bcrypt.hash(plainText, saltRounds)
  // saltRounds = 12 means bcrypt runs 2^12 iterations → secure but not too slow
  this.password = await bcrypt.hash(this.password, 12);
});

// =============================================================
//  INSTANCE METHOD: comparePassword
//
//  Added to every User document instance.
//  Use it to verify a login attempt:
//    const isMatch = await user.comparePassword(candidatePassword);
//
//  We can't just compare strings because the stored password
//  is a bcrypt hash. bcrypt.compare does the comparison safely.
// =============================================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// =============================================================
//  VIRTUAL: fullName
//
//  A "virtual" is a computed property that is NOT stored in
//  MongoDB — it's calculated on the fly.
//
//  Usage: user.fullName → "John Doe"
// =============================================================
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// =============================================================
//  CREATE AND EXPORT THE MODEL
//
//  mongoose.model("User", userSchema) does two things:
//  1. Registers the model with Mongoose
//  2. Creates a MongoDB collection named "users" (lowercase + plural)
// =============================================================
const User = mongoose.model("User", userSchema);

export default User;
