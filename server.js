// server.js

// Load environment variables from .env file (if present)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// =============================================================================
// MongoDB Connection using Mongoose
// =============================================================================

// Use the MONGODB_URI from environment variables or fallback to the provided URI
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://NaksuSite:NaksuSite@cluster0.nlpki.mongodb.net/Credentials?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// =============================================================================
// Mongoose Model Definitions
// =============================================================================

// User/Credentials Schema
const credentialsSchema = new mongoose.Schema({
  First_name: { type: String, required: true },
  Last_name: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true }, // Will store hashed password
});

const Credentials = mongoose.model("Credentials", credentialsSchema);

// Review Schema
const reviewSchema = new mongoose.Schema(
  {
    First_name: { type: String, required: true },
    Last_name: { type: String, required: true },
    ReviewText: { type: String, required: true },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);

// =============================================================================
// API Endpoints
// =============================================================================

// A simple test endpoint
app.get("/api", (req, res) => {
  res.json({ Fruits: ["apple", "orange", "banana"] });
});

// --------------------------
// User Signup Endpoint
// --------------------------
app.post("/signup", async (req, res) => {
  const { First_name, Last_name, Email, Password } = req.body;
  if (!First_name || !Last_name || !Email || !Password) {
    return res.status(400).json({ message: "Please fill in all fields" });
  }

  try {
    // Check if a user with the provided email already exists
    const userExists = await Credentials.findOne({ Email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(Password, 10);
    const newUser = new Credentials({
      First_name,
      Last_name,
      Email,
      Password: hashedPassword,
    });
    await newUser.save();

    console.log("Signup Successful");
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error in /signup:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------
// User Login Endpoint
// --------------------------
app.post("/login", async (req, res) => {
  const { Email, Password } = req.body;
  if (!Email || !Password) {
    return res.status(400).json({ message: "Please fill in all fields" });
  }

  try {
    const user = await Credentials.findOne({ Email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the hashed password
    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({ message: "Login successful", user });
  } catch (error) {
    console.error("Error in /login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------
// Submit Review Endpoint
// --------------------------
app.post("/submit-review", async (req, res) => {
  const { First_name, Last_name, ReviewText } = req.body;
  if (!First_name || !Last_name || !ReviewText) {
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });
  }

  try {
    const newReview = new Review({
      First_name,
      Last_name,
      ReviewText,
    });
    await newReview.save();
    console.log("Review submitted successfully");
    res
      .status(201)
      .json({ message: "Review submitted successfully", review: newReview });
  } catch (error) {
    console.error("Error in /submit-review:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------
// Get Reviews Endpoint (Random Reviews)
// --------------------------
app.get("/reviews", async (req, res) => {
  try {
    const limit = 4; // Number of reviews to return
    const reviews = await Review.aggregate([
      { $sample: { size: limit } },
      { $project: { First_name: 1, ReviewText: 1 } },
    ]);

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({ message: "No reviews found" });
    }

    res.status(200).json({ reviews });
  } catch (error) {
    console.error("Error in /reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------
// Checkout Endpoint (Sending Order Confirmation Email)
// --------------------------

// Setup Nodemailer transporter (using Gmail as an example)
// It is recommended to store your email credentials in environment variables.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "ariyanarshad11@gmail.com",
    pass: process.env.EMAIL_PASS || "pvxw dylw kfoz itat",
  },
});

app.post("/api/checkout", async (req, res) => {
  const { email, orderDetails } = req.body;
  console.log("Checkout request received:", email, orderDetails);

  if (
    !email ||
    !orderDetails ||
    !orderDetails.items ||
    orderDetails.items.length === 0
  ) {
    return res.status(400).json({ message: "Missing order details or email" });
  }

  // Create HTML list of order items
  const itemsList = orderDetails.items
    .map(
      (item) => `
    <li>
      <strong>${item.name}</strong><br>
      Price: $${item.price}<br>
      Quantity: ${item.quantity}<br>
      Subtotal: $${(item.price * item.quantity).toFixed(2)}
    </li>
  `
    )
    .join("");

  const orderSummary = `
    <h3>Your Order Summary:</h3>
    <ul>${itemsList}</ul>
    <p><strong>Total Amount: $${orderDetails.totalAmount}</strong></p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER || "ariyanarshad11@gmail.com",
    to: email,
    subject: "Your Order Confirmation",
    html: `
      <h1>Thank you for your purchase!</h1>
      <p>Dear Customer,</p>
      <p>We have received your order and it will be processed soon.</p>
      ${orderSummary}
      <p>If you have any questions, feel free to contact us.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res
      .status(200)
      .json({ message: "Order confirmed. Confirmation email sent!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res
      .status(500)
      .json({ message: "Error processing checkout and sending email." });
  }
});

// =============================================================================
// Start the Server (conditionally)
// =============================================================================

if (require.main === module) {
  // If the file is run directly (e.g., "node server.js"), start the server.
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
} else {
  // Otherwise (e.g., in Vercel's serverless environment), export the app.
  module.exports = app;
}
