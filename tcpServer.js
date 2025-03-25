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
        console.log("Données brutes reçues (Buffer) : ", data);

        try {
            // Vérification de la taille du buffer
            const buffer = data;
            if (buffer.length < 18) {
                console.log("Le buffer est trop petit pour contenir toutes les données attendues");
                return;
            }

            // Lecture de l'IMEI (identifiant du périphérique) à partir des premiers octets
            const imei = buffer.toString('ascii', 0, 15); // Supposons que l'IMEI fait 15 octets

            // Lecture de la latitude (4 octets à partir du 16e octet)
            const latitude = buffer.readFloatLE(15);
            // Lecture de la longitude (4 octets à partir du 19e octet)
            const longitude = buffer.readFloatLE(19);
            // Lecture de la vitesse (1 octet à partir du 23e octet)
            const speed = buffer.readUInt8(23);

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
