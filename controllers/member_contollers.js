const express = require("express");
const Member = require("../models/member_model");
const nodemailer = require("nodemailer");
const router = express.Router();

// Create a new member
router.post("/add", async (req, res) => {
  try {
    const { name, email, phone, address, dateOfBirth, role } = req.body;
    const newMember = new Member({
      name,
      email,
      phone,
      address,
      dateOfBirth,
      role,
    });
    await newMember.save();
    res
      .status(201)
      .json({ message: "Member added successfully", member: newMember });
  } catch (error) {
    res.status(500).json({ message: "Error adding member", error });
  }
});

// Get all members
router.get("/list", async (req, res) => {
  try {
    const members = await Member.find();
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: "Error fetching members", error });
  }
});

// Update a member
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMember = await Member.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res
      .status(200)
      .json({ message: "Member updated successfully", member: updatedMember });
  } catch (error) {
    res.status(500).json({ message: "Error updating member", error });
  }
});

// Delete a member
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Member.findByIdAndDelete(id);
    res.status(200).json({ message: "Member deleted successfully" });
  } catch (error) {
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

module.exports = router;
