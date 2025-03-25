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

        try {
            // Vérifiez si le message commence par '$GT06' pour être un message valide du GPS tracker
            if (message.startsWith('$GT06')) {
                const decodedData = decodeGpsData(message);
                if (decodedData) {
                    const { imei, latitude, longitude, speed, timestamp } = decodedData;
                    console.log(`Données décodées : IMEI: ${imei}, Latitude: ${latitude}, Longitude: ${longitude}, Vitesse: ${speed}, Heure: ${timestamp}`);

                    // Vérification si le deviceId (IMEI) existe déjà dans la base de données
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
                        const gpsEntry = new GpsData({ deviceId: imei, latitude, longitude, speed, timestamp });
                        await gpsEntry.save();
                        console.log("Nouvelles données GPS enregistrées !");
                    }
                } else {
                    console.log("Erreur de décodage des données.");
                }
            } else {
                console.log("Message non valide");
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement des données GPS :", error);
        }
    });

    socket.on('error', err => console.error("Erreur socket :", err));
    socket.on('end', () => console.log("Connexion terminée"));
});

// Fonction de décodage personnalisé
function decodeGpsData(message) {
    try {
        // Exemple de message : $GT06,imei,latitude,longitude,speed,date_time,checksum
        const parts = message.split(',');
        if (parts.length === 7 && parts[0] === '$GT06') {
            const imei = parts[1];
            const latitude = parseFloat(parts[2]);
            const longitude = parseFloat(parts[3]);
            const speed = parseFloat(parts[4]);
            const timestamp = parts[5]; // La date/heure peut être dans un format spécifique, à adapter
            return { imei, latitude, longitude, speed, timestamp };
        } else {
            console.log("Format de message incorrect");
            return null;
        }
    } catch (error) {
        console.error("Erreur lors du décodage des données GPS :", error);
        return null;
    }
}

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
