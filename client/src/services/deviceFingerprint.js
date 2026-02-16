export const getDeviceFingerprint = async () => {
    try {
        // Combinación de datos del navegador
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('DeviceFingerprint', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('DeviceFingerprint', 4, 17);

        const canvasData = canvas.toDataURL();
        
        // Información del navegador
        const browserInfo = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            canvasHash: canvasData.substring(0, 50)
        };

        // Crear hash simplificado
        const fingerprint = Object.values(browserInfo).join('|');
        
        return btoa(fingerprint).substring(0, 50);
    } catch (error) {
        console.error('Error generando fingerprint:', error);
        return 'default_fingerprint_' + Date.now();
    }
};
