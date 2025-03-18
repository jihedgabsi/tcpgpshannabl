const Voiture = require('../models/Voiture');
const GpsData = require('../models/GpsData');

// ✅ Ajouter une voiture avec l'ID de la donnée GPS uniquement
exports.createVoiture = async (req, res) => {
    try {
        const { matriculation, modele, nature, gpsDataId } = req.body;
        // Vérifier si la donnée GPS existe
        const gpsData = await GpsData.findById(gpsDataId);
        if (!gpsData) return res.status(404).json({ message: 'Donnée GPS non trouvée' });

        // Création de la voiture avec l'ID GPS
        const newVoiture = new Voiture({
            matriculation,
            modele,
            nature,
            gpsData: gpsData._id
        });

        await newVoiture.save();
        res.status(201).json({ message: 'Voiture ajoutée avec succès', voiture: newVoiture });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Mettre à jour une voiture
exports.updateVoiture = async (req, res) => {
    try {
        const { matriculation, modele, nature, gpsDataId } = req.body;

        // Vérifier si la voiture existe
        let voiture = await Voiture.findById(req.params.voitureId);
        if (!voiture) return res.status(404).json({ message: 'Voiture non trouvée' });

        // Vérifier si la nouvelle donnée GPS existe
        if (gpsDataId) {
            const gpsData = await GpsData.findById(gpsDataId);
            if (!gpsData) return res.status(404).json({ message: 'Donnée GPS non trouvée' });
            voiture.gpsData = gpsData._id;
        }

        // Mise à jour des autres champs
        voiture.matriculation = matriculation || voiture.matriculation;
        voiture.modele = modele || voiture.modele;
        voiture.nature = nature || voiture.nature;

        await voiture.save();
        res.status(200).json({ message: 'Voiture mise à jour', voiture });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Supprimer une voiture
exports.deleteVoiture = async (req, res) => {
    try {
        const voiture = await Voiture.findByIdAndDelete(req.params.voitureId);
        if (!voiture) return res.status(404).json({ message: 'Voiture non trouvée' });

        res.status(200).json({ message: 'Voiture supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Récupérer toutes les voitures
exports.getAllVoitures = async (req, res) => {
    try {
        const voitures = await Voiture.find().populate('gpsData', '_id');
        res.status(200).json(voitures);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Récupérer une voiture par ID
exports.getVoitureById = async (req, res) => {
    try {
        const voiture = await Voiture.findById(req.params.voitureId)
            .populate('gpsData', '_id');
        if (!voiture) return res.status(404).json({ message: 'Voiture non trouvée' });

        res.status(200).json(voiture);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
