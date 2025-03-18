const mongoose = require('mongoose');

const gpsSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GpsData', gpsSchema);
