module.exports.gt06 = (function() {
    const eventTypes = {
        '01': 'Login',
        '12': 'Position',
        '13': 'Heartbeat',
        '16': 'Alarme',
        'default': 'Inconnu'
    };

    const parseLogin = (data) => {
        return {
            eventType: eventTypes['01'],
            imei: Buffer.from(data.substr(8, 16), 'hex').toString('ascii'),
            serialNumber: parseInt(data.substr(22, 4), 16)
        };
    };

    const parsePosition = (data) => {
        return {
            latitude: parseInt(data.substr(22, 8), 16) / 1800000,
            longitude: parseInt(data.substr(30, 8), 16) / 1800000,
            speed: parseInt(data.substr(38, 2), 16),
            timestamp: parseDateTime(data.substr(8, 12))
        };
    };

    const parseDateTime = (hex) => {
        const buf = Buffer.from(hex, 'hex');
        return new Date(
            2000 + buf[0],
            buf[1] - 1,
            buf[2],
            buf[3],
            buf[4],
            buf[5]
        ).toISOString();
    };

    const parse = (hexData) => {
        if (!hexData.startsWith('7878')) {
            return { error: 'Entête invalide' };
        }

        const eventType = hexData.substr(6, 2);
        let parsedData;

        switch(eventType) {
            case '01':
                parsedData = parseLogin(hexData);
                break;
            case '12':
                parsedData = parsePosition(hexData);
                break;
            default:
                return {
                    event: eventType,
                    error: 'Protocole non supporté'
                };
        }

        return {
            event: eventType,
            eventType: eventTypes[eventType] || eventTypes['default'],
            parsed: parsedData,
            raw: hexData
        };
    };

    return { parse };
})();
