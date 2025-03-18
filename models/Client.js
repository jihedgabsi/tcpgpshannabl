const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    active: { type: Boolean, default: true },
    voitures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Voiture' }]
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
