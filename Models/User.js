const mongoose = require('mongoose');
const { Schema } = mongoose;

// ✅ Define Schema
const credentialsSchema = new Schema({
    First_name: { type: String, required: true },
    Last_name: { type: String, required: true },
    Email: { type: String, required: true, unique: true },
    Password: { type: String, required: true } // Hashed in `server.js`
});

// ✅ Export Model
module.exports = mongoose.model('Credentials', credentialsSchema);
