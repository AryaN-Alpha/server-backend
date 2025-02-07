// Models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    First_name: { type: String, required: true },
    Last_name: { type: String, required: true },
    ReviewText: { type: String, required: true },
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
