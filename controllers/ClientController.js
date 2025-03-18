const Client = require('../models/Client');
const Voiture = require('../models/Voiture');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Enregistrement d'un client
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const client = new Client({ name, email, phone, password: hashedPassword, active: true });
        await client.save();
        res.status(201).json({ message: 'Client enregistré', client });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Connexion d'un client
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const client = await Client.findOne({ email });
        if (!client) return res.status(404).json({ message: "Client non trouvé" });
        if (!client.active) return res.status(403).json({ message: "Compte désactivé" });

        const isMatch = await bcrypt.compare(password, client.password);
        if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

        const token = jwt.sign({ id: client._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ token, client });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Récupérer tous les clients
exports.getAllClients = async (req, res) => {
    try {
        const clients = await Client.find().select('-password');
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getByid = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findById(id).select('-password');
        if (!client) return res.status(404).json({ message: "Client non trouvé" });
        res.status(200).json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mettre à jour un client
exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedClient = await Client.findByIdAndUpdate(id, req.body, { new: true }).select('-password');
        if (!updatedClient) return res.status(404).json({ message: "Client non trouvé" });
        res.status(200).json({ message: "Client mis à jour", updatedClient });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Désactiver un client
exports.deactivateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findByIdAndUpdate(id, { active: false }, { new: true }).select('-password');
        if (!client) return res.status(404).json({ message: "Client non trouvé" });
        res.status(200).json({ message: "Client désactivé", client });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Supprimer un client
exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findByIdAndDelete(id);
        if (!client) return res.status(404).json({ message: "Client non trouvé" });
        res.status(200).json({ message: "Client supprimé" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addVoitureToClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { voitureId} = req.body;

        // Vérifier si le client existe
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: "Client non trouvé" });
        }

        // Vérifier si la voiture existe
        const voiture = await Voiture.findById(voitureId);
        if (!voiture) {
            return res.status(404).json({ message: "Voiture non trouvée" });
        }

        // Vérifier si la voiture est déjà associée au client
        if (client.voitures.includes(voitureId)) {
            return res.status(400).json({ message: "Cette voiture est déjà associée au client" });
        }

        // Ajouter la voiture au client
        client.voitures.push(voitureId);
        await client.save();

        res.status(200).json({ message: "Voiture ajoutée au client avec succès", client });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.removeVoitureFromClient = async (req, res) => {
    try {
        const { clientId} = req.params;
        const { voitureId} = req.body;

        // Vérifier si le client existe
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: "Client non trouvé" });
        }

        // Vérifier si la voiture est associée au client
        if (!client.voitures.includes(voitureId)) {
            return res.status(400).json({ message: "Cette voiture n'est pas associée à ce client" });
        }

        // Retirer la voiture du client
        client.voitures = client.voitures.filter(id => id.toString() !== voitureId);
        await client.save();

        res.status(200).json({ message: "Voiture retirée du client avec succès", client });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


