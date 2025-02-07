// server.js
require("dotenv").config();
const express = require('express');
const app = express();
const cors = require("cors");
const bcrypt = require("bcryptjs");
const Credentials = require("./Models/User");
const connectToMongoose = require("./db");
const Review = require('./Models/Review');
const nodemailer = require('nodemailer');
connectToMongoose();

app.use(cors({ origin: ["http://localhost:5173", "https://server-backend-one.vercel.app"], methods: "GET,POST,PUT,DELETE", allowedHeaders: "Content-Type,Authorization" }));
app.use(express.json());


app.get("/api", (req, res) => {
    res.json({ "Fruits": ["apple", "orange", "banana"] });
});

app.post('/signup', async (req, res) => {
    const { First_name, Last_name, Email, Password } = req.body;
    if (!First_name || !Last_name || !Email || !Password) {
        return res.status(400).json({ message: 'Please fill in all fields' });
    }

    try {
        const userExists = await Credentials.findOne({ Email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(Password, 10);
        const newUser = new Credentials({ First_name, Last_name, Email, Password: hashedPassword });
        await newUser.save();

        console.log("Signup Successful");
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/login', async (req, res) => {
    const { Email, Password } = req.body;
    if (!Email || !Password) {
        return res.status(400).json({ message: 'Please fill in all fields' });
    }

    try {
        const user = await Credentials.findOne({ Email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(Password, user.Password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/submit-review', async (req, res) => {
    const { First_name, Last_name, ReviewText } = req.body;
    if (!First_name || !Last_name || !ReviewText) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        const newReview = new Review({
            First_name,
            Last_name,
            ReviewText, // Correct the field name
        });

        await newReview.save();
        console.log("Review submitted successfully");
        res.status(201).json({ message: 'Review submitted successfully', review: newReview });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/reviews', async (req, res) => {
    try {
        const limit = 4;  // Set the number of reviews you want to fetch

        // Fetch random reviews using aggregation
        const reviews = await Review.aggregate([
            { $sample: { size: limit } }, // Randomly select 'limit' number of reviews
            { $project: { First_name: 1, ReviewText: 1 } } // Only select the required fields
        ]);

        if (!reviews || reviews.length === 0) {
            return res.status(404).json({ message: 'No reviews found' });
        }

        res.status(200).json({ reviews });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Server error' });
    }
});







// Setup Nodemailer transporter (using Gmail as an example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ariyanarshad11@gmail.com',  // Your email address
        pass: 'pvxw dylw kfoz itat',    // Your email password or app-specific password
    },
});

app.post('/api/checkout', async (req, res) => {
    const { email, orderDetails } = req.body;
    console.log("hello world " , email , orderDetails)
    // Check if email and order details are provided
    if (!email || !orderDetails || !orderDetails.items || orderDetails.items.length === 0) {
        return res.status(400).json({ message: 'Missing order details or email' });
    }

    // Construct the email content
    let itemsList = orderDetails.items.map(item => `
        <li>
            <strong>${item.name}</strong><br>
            Price: $${item.price}<br>
            Quantity: ${item.quantity}<br>
            Subtotal: $${item.price * item.quantity}
        </li>
    `).join('');

    const orderSummary = `
        <h3>Your Order Summary:</h3>
        <ul>${itemsList}</ul>
        <p><strong>Total Amount: $${orderDetails.totalAmount}</strong></p>
    `;

    // Create email options
    const mailOptions = {
        from: 'ariyanarshad11@gmail.com', // Sender address
        to: email, // Recipient address
        subject: 'Your Order Confirmation', // Subject line
        html: `
            <h1>Thank you for your purchase!</h1>
            <p>Dear Customer,</p>
            <p>We have received your order and it will be processed soon.</p>
            ${orderSummary}
            <p>If you have any questions, feel free to contact us.</p>
        `, // HTML body content
    };

    // Send email
    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Order confirmed. Confirmation email sent!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Error processing checkout and sending email.' });
    }
});




app.listen(process.env.PORT, () => {
    console.log("Server started on port 8080");
});
