const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ["admin", "staff"], default: "staff" },
  phone: { type: String, required: ["Phone number is required", true] },
  password: { type: String, required: true },
  otp: { type: String }, // Add OTP field
  otpExpires: { type: Date },
  isSuspended: { type: Boolean, default: false },
});

module.exports = mongoose.model("Staff", staffSchema);
