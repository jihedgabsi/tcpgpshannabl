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
        // Affichage des données brutes en hexadécimal pour comprendre leur format
        console.log("Données brutes reçues (Hex) : ", data.toString('hex'));

        // Essayons de lire le message en binaire en décodant à partir du buffer
        const buffer = data;
        console.log("Données brutes reçues (Buffer) : ", buffer);

        try {
            // Si vous avez des informations sur la structure des données, vous pouvez les parser directement à partir du buffer.
            // Exemple pour un décodage d'IMEI (premiers 15 caractères) et latitude/longitude
            const imei = buffer.toString('ascii', 0, 15);  // Exemple: IMEI à partir des 15 premiers octets
            const latitude = buffer.readFloatLE(15); // Exemple: lecture de latitude en 4 octets
            const longitude = buffer.readFloatLE(19); // Exemple: lecture de longitude en 4 octets
            const speed = buffer.readUInt8(23); // Exemple: lecture de la vitesse à partir de l'octet 23

            console.log(`Données décodées : IMEI: ${imei}, Latitude: ${latitude}, Longitude: ${longitude}, Vitesse: ${speed}`);

            // Vérifier si l'IMEI existe déjà dans la base de données
            const existingGpsEntry = await GpsData.findOne({ deviceId: imei });

            if (existingGpsEntry) {
                // Mise à jour des données existantes
                await GpsData.updateOne(
                    { deviceId: imei },
                    { latitude, longitude, speed, updatedAt: new Date() }
                );
                console.log("Données GPS mises à jour !");
            } else {
                // Création d'un nouvel enregistrement
                const gpsEntry = new GpsData({ deviceId: imei, latitude, longitude, speed });
                await gpsEntry.save();
                console.log("Nouvelles données GPS enregistrées !");
            }

        } catch (error) {
            console.error("Erreur lors du décodage des données GPS :", error);
        }
    });

    socket.on('error', err => console.error("Erreur socket :", err));
    socket.on('end', () => console.log("Connexion terminée"));
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
