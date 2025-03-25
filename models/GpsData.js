const mongoose = require('mongoose');

const GpsDataSchema = new mongoose.Schema({
    deviceId: String,
    latitude: Number,
    longitude: Number,
    speed: Number,
    timestamp: Date,
    additionalInfo: {
        loginData: String,
        connectionInfo: {
            ip: String,
            port: Number
        },
        satellitesCount: Number,
        gpsSignal: String
    }
});

// Vérifier si le modèle existe déjà
const GpsData = mongoose.models.GpsData || mongoose.model('GpsData', GpsDataSchema);

module.exports = GpsData;
