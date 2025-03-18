const GpsData = require('../models/GpsData');

// ✅ Ajouter une nouvelle donnée GPS
exports.addGpsData = async (req, res) => {
    try {
        const { deviceId, latitude, longitude, speed } = req.body;
        const gpsData = new GpsData({ deviceId, latitude, longitude, speed });
        await gpsData.save();
        res.status(201).json({ message: 'Donnée GPS ajoutée avec succès', gpsData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Récupérer toutes les données GPS
exports.getAllGpsData = async (req, res) => {
    try {
        const gpsData = await GpsData.find();
        res.status(200).json(gpsData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Récupérer une donnée GPS par ID
exports.getGpsDataById = async (req, res) => {
    try {
        const gpsData = await GpsData.findById(req.params.gpsDataId);
        if (!gpsData) return res.status(404).json({ message: 'Donnée GPS non trouvée' });

        res.status(200).json(gpsData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Mettre à jour une donnée GPS
exports.updateGpsData = async (req, res) => {
    try {
        const { deviceId, latitude, longitude, speed } = req.body;
        let gpsData = await GpsData.findById(req.params.gpsDataId);

        if (!gpsData) return res.status(404).json({ message: 'Donnée GPS non trouvée' });

        gpsData.deviceId = deviceId || gpsData.deviceId;
        gpsData.latitude = latitude || gpsData.latitude;
        gpsData.longitude = longitude || gpsData.longitude;
        gpsData.speed = speed || gpsData.speed;

        await gpsData.save();
        res.status(200).json({ message: 'Donnée GPS mise à jour', gpsData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Supprimer une donnée GPS
exports.deleteGpsData = async (req, res) => {
    try {
        const gpsData = await GpsData.findByIdAndDelete(req.params.gpsDataId);
        if (!gpsData) return res.status(404).json({ message: 'Donnée GPS non trouvée' });

        res.status(200).json({ message: 'Donnée GPS supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
