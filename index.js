require("dotenv").config(); // To load environment variables
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
// Import routes
// Replace with the path to your staff routes
const memberRoutes = require("./controllers/member_contollers"); // Replace with the path to your member routes
const scheduleBirthdayJob = require("./utils/jobs/sendbirthdayemail");

// Create Express app
const app = express();
app.use(cors());
// Middleware
app.use(bodyParser.json());

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

// Routes
// app.use("/api/staff", staffRoutes);
app.use("/api/members", memberRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the Church Management API");
});
scheduleBirthdayJob();
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
