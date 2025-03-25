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
        console.log(`Données JSON reçues : ${message}`);

        try {
            // Parse les données JSON
            const jsonData = JSON.parse(message);
            console.log('Contenu JSON parsé :', JSON.stringify(jsonData, null, 2));

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
            console.error("Erreur de parsing JSON :", parseError);
        }
    });

    socket.on('error', err => console.error("Erreur socket :", err));
    socket.on('end', () => console.log("Connexion terminée"));
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
