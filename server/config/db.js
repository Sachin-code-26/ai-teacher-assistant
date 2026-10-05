// =============================================================
//  server/config/db.js  — MongoDB connection setup
//
//  Why a separate file?
//  Keeping DB connection logic out of index.js makes it clean
//  and reusable. If you ever switch databases, you only change
//  this one file.
//
//  How Mongoose works:
//  Mongoose is an ODM (Object Document Mapper). It lets you
//  define a "schema" (shape of your data) and then interact
//  with MongoDB using JavaScript objects instead of raw queries.
// =============================================================

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Re-throw the error so startServer() in index.js can catch it
    throw error;
  }
};

export default connectDB;
