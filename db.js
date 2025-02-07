require("dotenv").config();
const mongoose = require('mongoose');

 // ✅ Use `127.0.0.1` for better reliability

function connectToMongoose() {
    mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoose.connection.on("connected", () => {
        console.log("Connected to MongoDB Successfully");
    });

    mongoose.connection.on("error", (err) => {
        console.error("MongoDB Connection Error:", err);
    });
}

module.exports = connectToMongoose;
