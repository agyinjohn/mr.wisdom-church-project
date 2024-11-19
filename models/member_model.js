const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  dateOfBirth: { type: Date },
  dateJoined: { type: Date, default: Date.now },
  role: { type: String, default: "Member" },
  membershipStatus: { type: String, default: "Active" },
});

module.exports = mongoose.model("Member", MemberSchema);
