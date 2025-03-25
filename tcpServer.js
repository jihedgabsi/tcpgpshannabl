const crypto = require('crypto');

class UniversalGpsConverter {
  constructor() {
    // Bibliothèque de protocoles supportés
    this.protocols = {
      GT06N: this.decodeGT06N,
      XEXUN: this.decodeXexun,
      TELTONIKA: this.decodeTeltonika,
      COBAN: this.decodeCoban,
      MEITRACK: this.decodeMeitrack
    };
  }

  // Méthode principale de conversion
  convert(rawData, protocol = null) {
    // Normalisation des données en hexadécimal
    const hexData = this.toHex(rawData);

    // Auto-détection du protocole si non spécifié
    if (!protocol) {
      protocol = this.detectProtocol(hexData);
    }

    // Conversion selon le protocole
    if (this.protocols[protocol]) {
      return this.protocols[protocol].call(this, hexData);
    }

    // Retour par défaut si aucun protocole ne match
    return {
      success: false,
      protocol: 'Unknown',
      rawData: hexData,
      error: 'Protocole non reconnu'
    };
  }

  // Méthode de détection automatique du protocole
  detectProtocol(hexData) {
    const protocolSignatures = {
      GT06N: /^7878/,
      XEXUN: /^\$GPRMC/,
      TELTONIKA: /^00000000/,
      COBAN: /^\*HQ/,
      MEITRACK: /^\$MEITRACK/
    };

    for (const [protocol, signature] of Object.entries(protocolSignatures)) {
      if (signature.test(hexData)) {
        return protocol;
      }
    }

    return 'Unknown';
  }

  // Convertisseur GT06N
  decodeGT06N(hexData) {
    try {
      const buffer = Buffer.from(hexData, 'hex');
      const messageType = buffer[4];

      switch (messageType) {
        case 0x01: // Login
          return {
            success: true,
            protocol: 'GT06N',
            type: 'login',
            imei: buffer.slice(5, 12).toString('hex')
          };

        case 0x10: // Position
          const latitude = this.decodeCoordinate(buffer.slice(11, 15));
          const longitude = this.decodeCoordinate(buffer.slice(15, 19));

          return {
            success: true,
            protocol: 'GT06N',
            type: 'position',
            latitude: latitude,
            longitude: longitude,
            speed: buffer[19],
            timestamp: this.decodeDate(buffer.slice(5, 11))
          };

        default:
          return {
            success: false,
            protocol: 'GT06N',
            error: 'Type de message non supporté'
          };
      }
    } catch (error) {
      return {
        success: false,
        protocol: 'GT06N',
        error: error.message
      };
    }
  }

  // Convertisseur Xexun
  decodeXexun(hexData) {
    // Implémentation basique, à adapter selon le format spécifique
    const asciiData = Buffer.from(hexData, 'hex').toString('ascii');
    const parts = asciiData.split(',');

    if (parts[0] === '$GPRMC' && parts.length >= 7) {
      return {
        success: true,
        protocol: 'XEXUN',
        type: 'position',
        latitude: this.convertDMSToDecimal(parts[3], parts[4]),
        longitude: this.convertDMSToDecimal(parts[5], parts[6]),
        speed: parseFloat(parts[7]) || 0
      };
    }

    return {
      success: false,
      protocol: 'XEXUN',
      error: 'Format de données invalide'
    };
  }

  // Convertisseur Teltonika
  decodeTeltonika(hexData) {
    // Implémentation basique, nécessite des ajustements selon le modèle exact
    try {
      const buffer = Buffer.from(hexData, 'hex');
      return {
        success: true,
        protocol: 'TELTONIKA',
        type: 'position',
        rawData: hexData
      };
    } catch (error) {
      return {
        success: false,
        protocol: 'TELTONIKA',
        error: error.message
      };
    }
  }

  // Convertisseur Coban
  decodeCoban(hexData) {
    const asciiData = Buffer.from(hexData, 'hex').toString('ascii');
    const parts = asciiData.split(',');

    if (parts[0] === '*HQ' && parts.length >= 10) {
      return {
        success: true,
        protocol: 'COBAN',
        type: 'position',
        latitude: parseFloat(parts[3]),
        longitude: parseFloat(parts[5]),
        speed: parseFloat(parts[7]) || 0
      };
    }

    return {
      success: false,
      protocol: 'COBAN',
      error: 'Format de données invalide'
    };
  }

  // Convertisseur Meitrack
  decodeMeitrack(hexData) {
    const asciiData = Buffer.from(hexData, 'hex').toString('ascii');
    const parts = asciiData.split(',');

    if (parts[0] === '$MEITRACK' && parts.length >= 15) {
      return {
        success: true,
        protocol: 'MEITRACK',
        type: 'position',
        latitude: parseFloat(parts[3]),
        longitude: parseFloat(parts[5]),
        speed: parseFloat(parts[7]) || 0
      };
    }

    return {
      success: false,
      protocol: 'MEITRACK',
      error: 'Format de données invalide'
    };
  }

  // Utilitaires de conversion

  // Convertit différents formats d'entrée en hexadécimal
  toHex(data) {
    if (typeof data === 'string') {
      // Si déjà en hex
      if (/^[0-9A-Fa-f]+$/.test(data)) return data;
      
      // Conversion de string ASCII
      return Buffer.from(data).toString('hex');
    }
    
    if (data instanceof Buffer) {
      return data.toString('hex');
    }

    throw new Error('Format de données non supporté');
  }

  // Conversion coordonnées GT06N
  decodeCoordinate(coordBuffer) {
    const value = coordBuffer.readUInt32BE(0);
    const degrees = Math.floor(value / 1000000);
    const minutes = (value % 1000000) / 10000;
    return degrees + (minutes / 60);
  }

  // Conversion coordonnées DMS en décimal
  convertDMSToDecimal(value, direction) {
    const degrees = Math.floor(parseFloat(value) / 100);
    const minutes = parseFloat(value) % 100;
    const decimal = degrees + (minutes / 60);
    return direction === 'S' || direction === 'W' ? -decimal : decimal;
  }

  // Décodage de date GT06N
  decodeDate(dateBuffer) {
    const year = dateBuffer.readUInt8(0) + 2000;
    const month = dateBuffer.readUInt8(1);
    const day = dateBuffer.readUInt8(2);
    const hours = dateBuffer.readUInt8(3);
    const minutes = dateBuffer.readUInt8(4);
    const seconds = dateBuffer.readUInt8(5);

    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  // Ajouter un nouveau protocole personnalisé
  addProtocol(name, decoderFunction) {
    this.protocols[name] = decoderFunction;
  }
}

// Exemple d'utilisation
const gpsConverter = new UniversalGpsConverter();

// Exportation
module.exports = UniversalGpsConverter;

// Exemple de test
if (require.main === module) {
  // Tests des différents protocoles
  const testCases = [
    { data: '7878...', protocol: 'GT06N' },
    { data: '$GPRMC,...', protocol: 'XEXUN' },
    { data: '*HQ,...', protocol: 'COBAN' }
  ];

  testCases.forEach(test => {
    console.log(
      `Test ${test.protocol}:`, 
      gpsConverter.convert(test.data, test.protocol)
    );
  });
}
