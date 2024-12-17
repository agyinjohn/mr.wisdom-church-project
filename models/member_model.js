const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: ["name cannot be empty", true] },
  email: {
    type: String,
    required: ["email cannot be empty", true],
    unique: true,
  },
  phone: { type: String, required: ["Phone number is required", true] },
  dateOfBirth: { type: Date },
  gender: {
    type: String,
    required: ["Gender is required", true],
    enum: ["Male", "Female"],
  },
  membershipStatus: { type: String, default: "Active" },
});

module.exports = mongoose.model("Member", MemberSchema);
