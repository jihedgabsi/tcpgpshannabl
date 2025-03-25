const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');

dotenv.config();
connectDB();

const server = net.createServer(socket => {
    console.log('Nouvelle connexion TCP');
    let buffer = '';

    socket.on('data', async data => {
        const receivedData = data.toString();
        buffer += receivedData;
        
        try {
            // Attempt to parse complete JSON
            const jsonData = JSON.parse(buffer);
            
            // Reset buffer after successful parsing
            buffer = '';

            console.log('Données JSON reçues :', JSON.stringify(jsonData, null, 2));

            // Vérifier si les champs nécessaires sont présents
            if (jsonData.deviceId && jsonData.latitude && jsonData.longitude) {
                try {
                    // Vérifier si le deviceId existe déjà
                    const existingGpsEntry = await GpsData.findOne({ deviceId: jsonData.deviceId });

                    if (existingGpsEntry) {
                        // Mise à jour des données existantes
                        await GpsData.updateOne(
                            { deviceId: jsonData.deviceId },
                            { 
                                latitude: jsonData.latitude, 
                                longitude: jsonData.longitude, 
                                speed: jsonData.speed || 0,
                                updatedAt: new Date() 
                            }
                        );
                        console.log("Données GPS mises à jour !");
                    } else {
                        // Création d'un nouvel enregistrement si deviceId n'existe pas
                        const gpsEntry = new GpsData({
                            deviceId: jsonData.deviceId,
                            latitude: jsonData.latitude,
                            longitude: jsonData.longitude,
                            speed: jsonData.speed || 0
                        });
                        await gpsEntry.save();
                        console.log("Nouvelles données GPS enregistrées !");
                    }
                } catch (error) {
                    console.error("Erreur lors de l'enregistrement des données GPS :", error);
                }
            } else {
                console.log("Données JSON incomplètes");
            }
        } catch (parseError) {
            // Si le parsing échoue, cela peut être dû à des données partielles
            // On conserve le buffer pour le prochain morceau de données
            console.log("Données partielles reçues, en attente du reste...");
        }
    });

    socket.on('error', err => console.error("Erreur socket :", err));
    socket.on('end', () => {
        console.log("Connexion terminée");
        buffer = ''; // Réinitialiser le buffer
    });
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
