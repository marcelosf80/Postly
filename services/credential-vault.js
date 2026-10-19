const crypto = require('crypto');

function encryptionKey() {
    const secret = process.env.AI_SETTINGS_ENCRYPTION_KEY;
    if (!secret || secret.length < 32) {
        throw new Error('Configura AI_SETTINGS_ENCRYPTION_KEY con al menos 32 caracteres para guardar credenciales de IA.');
    }
    return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

function encrypt(value) {
    if (!value) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('hex'), tag.toString('hex'), ciphertext.toString('hex')].join(':');
}

function decrypt(value) {
    if (!value) return '';
    try {
        const [ivHex, tagHex, ciphertextHex] = value.split(':');
        if (!ivHex || !tagHex || !ciphertextHex) throw new Error('Formato inválido');
        const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return Buffer.concat([
            decipher.update(Buffer.from(ciphertextHex, 'hex')),
            decipher.final()
        ]).toString('utf8');
    } catch (error) {
        throw new Error('No se pudo descifrar la credencial de IA. Revisa AI_SETTINGS_ENCRYPTION_KEY.');
    }
}

module.exports = { encrypt, decrypt };
