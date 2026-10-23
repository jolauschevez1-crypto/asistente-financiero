const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const logger = require('../utils/logger');

class GroqService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        // 🟢 AQUÍ ESTÁ EL CAMBIO: 'openai' en lugar de 'openapi'
        this.baseUrl = 'https://api.groq.com/openai/v1';
        this.chatModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
        this.provider = process.env.AI_PROVIDER || 'disabled';
        this.timeoutMs = Math.min(120000, Math.max(1000, Number(process.env.AI_TIMEOUT_MS) || 20000));
        this.whisperModel = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3';

        if (this.provider === 'groq' && (!this.apiKey || this.apiKey.includes('TU_GROQ_API_KEY'))) {
            logger.warn('GROQ_API_KEY no está configurado correctamente en el archivo .env');
        }
    }

    /**
     * Envía un prompt a la API de Groq para completar chat.
     * @param {Array} messages - Lista de mensajes de conversación.
     * @param {Object} options - Opciones adicionales (temperature, jsonMode, etc).
     */
    status() {
        const enabled = this.provider === 'groq' && Boolean(this.apiKey?.trim());
        return { enabled, provider: enabled ? 'groq' : 'disabled', model: enabled ? this.chatModel : null,
            message: enabled ? 'Groq configurado. Requiere Internet.' : 'La IA todavía no está configurada. Las funciones financieras siguen disponibles.' };
    }

    requireConfigured() {
        if (!this.status().enabled) { const error = new Error(this.status().message); error.status = 503; error.expose = true; throw error; }
    }

    providerError(error) {
        const status = error.response?.status;
        const message = status === 401 || status === 403 ? 'La configuración de acceso a IA no es válida.' :
            status === 429 ? 'El servicio de IA alcanzó su límite. Intenta más tarde.' :
            error.code === 'ECONNABORTED' ? 'La IA tardó demasiado en responder. Intenta nuevamente.' :
            status === 400 || status === 404 ? 'El modelo de IA no está disponible. Revisa su configuración.' :
            'No se pudo contactar con la IA. Tus datos no se modificaron.';
        logger.warn('Solicitud de IA fallida', { status: status || 0, code: error.code || 'PROVIDER_ERROR' });
        const safe = new Error(message); safe.status = 503; safe.expose = true; return safe;
    }

    async getChatCompletion(messages, options = {}) {
        this.requireConfigured();
        try {
            const url = `${this.baseUrl}/chat/completions`;
            const data = {
                model: this.chatModel,
                messages,
                temperature: options.temperature !== undefined ? options.temperature : 0.1,
                max_completion_tokens: Math.min(4096, Math.max(64, options.max_tokens || 1500)),
            };

            if (options.jsonMode) {
                data.response_format = { type: 'json_object' };
            }

            logger.debug(`Enviando consulta a Groq con modelo: ${this.chatModel}`);

            const response = await axios.post(url, data, {
                timeout: this.timeoutMs,
                maxContentLength: 2 * 1024 * 1024,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (typeof response.data?.choices?.[0]?.message?.content !== 'string') throw new Error('Respuesta de IA inválida');
            return response.data;
        } catch (error) {
            throw this.providerError(error);
        }
    }

    /**
     * Transcribe un archivo de audio mediante la API de Whisper en Groq.
     * @param {string} filePath - Ruta absoluta del archivo de audio (.mp3, .wav, .m4a, etc).
     * @param {string} language - Idioma opcional (ej: 'es').
     */
    async transcribeAudio(filePath, language = 'es') {
        this.requireConfigured();
        try {
            const url = `${this.baseUrl}/audio/transcriptions`;

            if (!fs.existsSync(filePath) || fs.statSync(filePath).size > 25 * 1024 * 1024) {
                throw new Error('El audio no existe o supera 25 MB.');
            }

            const form = new FormData();
            form.append('file', fs.createReadStream(filePath));
            form.append('model', this.whisperModel);
            form.append('language', language);
            form.append('response_format', 'json');

            logger.debug(`Enviando audio para transcribir a Groq Whisper con modelo: ${this.whisperModel}`);

            const response = await axios.post(url, form, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...form.getHeaders()
                },
                timeout: this.timeoutMs,
                maxContentLength: 1024 * 1024,
                maxBodyLength: 26 * 1024 * 1024
            });

            return response.data; // { text: "..." }
        } catch (error) {
            throw this.providerError(error);
        }
    }
}

module.exports = new GroqService();
