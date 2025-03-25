const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');
const f = require('./functions');
const crc = require('crc');

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
            // Traitement du message selon le format de données venant du GPS, en intégrant le décodage
            const parts = decodeGpsData(message);
            if (parts) {
                const { deviceId, latitude, longitude, speed } = parts;
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
                console.log("Format de données non valide");
            }
        }
    });

    socket.on('error', err => console.error("Erreur socket :", err));
    socket.on('end', () => console.log("Connexion terminée"));
});

// Fonction de décodage des données GPS
function decodeGpsData(message) {
    try {
        const data = message.toString('hex');

        // Exemple de décodage basé sur votre format GT06
        const parts = {
            'start': data.substr(0, 4),
            'length': parseInt(data.substr(4, 2), 16),
            'finish': data.substr(6 + parts['length'] * 2, 4),
            'protocal_id': data.substr(6, 2),
        };

        if (parts['start'] === '7878') {
            parts['device_id'] = data.substr(8, 16);
            parts['latitude_raw'] = data.substr(24, 8);
            parts['longitude_raw'] = data.substr(32, 8);

            parts['latitude'] = dexToDegrees(parts['latitude_raw']);
            parts['longitude'] = dexToDegrees(parts['longitude_raw']);

            parts['speed'] = parseInt(data.substr(40, 2), 16);

            return {
                deviceId: parts.device_id,
                latitude: parts.latitude,
                longitude: parts.longitude,
                speed: parts.speed
            };
        }
    } catch (error) {
        console.error("Erreur lors du décodage des données : ", error);
        return null;
    }
}

// Fonction pour convertir les données de degrés
function dexToDegrees(dex) {
    return parseInt(dex, 16) / 1800000;
}

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
