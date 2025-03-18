const mongoose = require('mongoose');

const voitureSchema = new mongoose.Schema({
    matriculation: { type: String, required: true, unique: true },
    modele: { type: String, required: true },
    nature: { type: String, enum: ['voiture', 'camion'], required: true },
    gpsData: { type: mongoose.Schema.Types.ObjectId, ref: 'GpsData' }, // Une seule valeur
}, { timestamps: true });

module.exports = mongoose.model('Voiture', voitureSchema);
