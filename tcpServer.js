const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');

dotenv.config();
connectDB();

const server = net.createServer(socket => {
    console.log('Nouvelle connexion TCP');

    socket.on('data', async data => {
        const message = data.toString().trim();
        console.log(`Données reçues : ${message}`);

        // Exemple de format attendu : "123456,48.8566,2.3522,30"
        const parts = message.split(',');

        if (parts.length === 4) {
            const deviceId = parts[0];
            const latitude = parseFloat(parts[1]);
            const longitude = parseFloat(parts[2]);
            const speed = parseFloat(parts[3]);

            try {
                // Vérifier si le deviceId existe déjà
                const existingGpsEntry = await GpsData.findOne({ deviceId });

                if (existingGpsEntry) {
                    // Mise à jour des données existantes
                    await GpsData.updateOne(
                        { deviceId },
                        { latitude, longitude, speed, updatedAt: new Date() }
                    );
                    console.log("Données GPS mises à jour !");
                } else {
                    // Création d'un nouvel enregistrement si deviceId n'existe pas
                    const gpsEntry = new GpsData({ deviceId, latitude, longitude, speed });
                    await gpsEntry.save();
                    console.log("Nouvelles données GPS enregistrées !");
                }
            } catch (error) {
                console.error("Erreur lors de l'enregistrement des données GPS :", error);
            }
        } else {
            console.log("Format incorrect");
        }
    });

    socket.on('error', err => console.error("Erreur socket :", err));
    socket.on('end', () => console.log("Connexion terminée"));
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
