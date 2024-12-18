const express = require("express");
const Member = require("../models/member_model");
const nodemailer = require("nodemailer");
const router = express.Router();
const StaffSchema = require("../models/staff_model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const authenticate = require("../utils/authenticate_middleware");
const { default: mongoose } = require("mongoose");
//

const isAdmin = async (req, res, next) => {
  const { role } = req.user; // Assuming user is added to req.user after authentication
  if (role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// Create a new staff account (Admin only)
router.post("/create", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, email, role, position, phone } = req.body;
    // console.log(email);
    // Generate a random password
    const password = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await StaffSchema.findOne({ email });
    // console.log(user);
    if (user) {
      return res
        .status(404)
        .json({ message: "Email is in use by another account" });
    }
    const newStaff = new StaffSchema({
      name,
      email,
      role,
      phone,
      position,
      password: hashedPassword,
    });
    await newStaff.save();

    // Send email to staff with the password
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Your Staff Account Credentials",
      text: `Hello ${name},\n\nYour account has been created. Use the following credentials to log in:\n\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after logging in.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Staff account created and email sent" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating staff account", error });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the staff exists
    const staff = await StaffSchema.findOne({ email });
    if (!staff) {
      return res.status(404).json({ message: "Invalid email or password" });
    }

    // Check if the account is suspended
    if (staff.isSuspended) {
      return res
        .status(403)
        .json({ message: "Account is suspended. Please contact the admin." });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, staff.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error logging in", error });
  }
});

router.get("/staff/list", authenticate, isAdmin, async (req, res) => {
  try {
    const members = await StaffSchema.find();
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: "Error fetching staff", error });
  }
});
// Suspend or delete a staff account (Admin only)
router.put("/suspend/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    const staff = await StaffSchema.findByIdAndUpdate(
      id,
      { isSuspended },
      { new: true }
    );
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    res.status(200).json({
      message: `Staff account ${isSuspended ? "suspended" : "reactivated"}`,
      staff,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating staff account", error });
  }
});

router.delete("/delete/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await StaffSchema.findByIdAndDelete(id);
    res.status(200).json({ message: "Staff account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting staff account", error });
  }
});

// Forgot Password (OTP-based)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const staff = await StaffSchema.findOne({ email });
    if (!staff)
      return res
        .status(404)
        .json({ message: "User with this email not found" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    staff.otp = await bcrypt.hash(otp, 10); // Add OTP to the staff document
    staff.otpExpires = Date.now() + 15 * 60 * 1000; // OTP valid for 15 minutes
    await staff.save();

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. It will expire in 15 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(email);
    console.log(otp);
    // Find user
    const staff = await StaffSchema.findOne({ email });
    if (!staff) return res.status(404).json({ message: "User not found" });
    console.log(staff);
    // Validate OTP
    const isOtpValid = await bcrypt.compare(otp, staff.otp);
    console.log(isOtpValid);
    if (!isOtpValid || staff.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Generate verification ID (JWT)
    const verificationId = jwt.sign(
      { email: staff.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // Valid for 15 minutes
    );

    // Clear OTP
    staff.otp = undefined;
    staff.otpExpires = undefined;
    await staff.save();

    res.status(200).json({
      message: "OTP verified successfully",
      verificationId, // Send verification ID to frontend
    });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP", error });
  }
});
// Reset Password
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Find staff by their ID from the authenticated token
    const staff = await StaffSchema.findById(req.user.id);
    if (!staff) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      staff.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password
    staff.password = await bcrypt.hash(newPassword, 10);
    await staff.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error changing password", error });
  }
});
//
router.post("/update-password", async (req, res) => {
  try {
    const { verificationId, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(verificationId, process.env.JWT_SECRET);
    if (!decoded)
      return res.status(400).json({ message: "Invalid verification ID" });

    // Find user
    const staff = await StaffSchema.findOne({ email: decoded.email });
    if (!staff) return res.status(404).json({ message: "User not found" });

    // Update password
    staff.password = await bcrypt.hash(newPassword, 10);
    await staff.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Verification ID has expired" });
    }
    res.status(500).json({ message: "Error updating password", error });
  }
});

// Create a new member
router.post("/add", authenticate, async (req, res) => {
  try {
    const { name, email, phone, dateOfBirth, gender } = req.body;
    const user = await Member.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "Email is already associated with a user" });
    }
    const newMember = new Member({
      name,
      email,
      gender,
      phone,
      dateOfBirth,
    });
    await newMember.save();
    res
      .status(201)
      .json({ message: "Member added successfully", member: newMember });
  } catch (error) {
    // console.log(error.errors);
    res.status(500).json({ message: `${error}` });
  }
});

// Get all members
router.get("/list", authenticate, async (req, res) => {
  try {
    const members = await Member.find();
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: "Error fetching members", error });
  }
});

// Update a member
router.put("/update/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }

    // Find the member
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Update the member with the request body
    const allowedFields = [
      "name",
      "email",
      "phone",
      "dateOfBirth",
      "gender",
      "membershipStatus",
    ];
    const updates = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Perform the update
    const updatedMember = await Member.findByIdAndUpdate(id, updates, {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation rules are applied
    });

    // Send response
    res.status(200).json({
      message: "Member updated successfully",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ message: "Error updating member", error });
  }
});

// Delete a member
router.delete("/deletemember/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    await Member.findByIdAndDelete(id);
    res.status(200).json({ message: "Member deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error deleting member", error });
  }
});

// Send an email to a member
router.post("/send-email", async (req, res) => {
  const { email, subject, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL, // Set in .env file
        pass: process.env.PASSWORD, // Set in .env file
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending email", error });
  }
});

// Function to send birthday alerts a day before

module.exports = router;
