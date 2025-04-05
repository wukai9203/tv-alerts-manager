import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { errorMonitoring } from './error-monitoring';

class I18nManager {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            await i18next
                .use(Backend)
                .use(LanguageDetector)
                .use(initReactI18next)
                .init({
                    fallbackLng: 'en',
                    debug: process.env.NODE_ENV === 'development',
                    interpolation: {
                        escapeValue: false,
                    },
                    backend: {
                        loadPath: '/locales/{{lng}}/{{ns}}.json',
                    },
                    detection: {
                        order: ['localStorage', 'navigator'],
                        caches: ['localStorage'],
                    },
                });

            this.initialized = true;
            errorMonitoring.captureMessage('i18n initialized successfully', 'info');
        } catch (error) {
            errorMonitoring.captureError(error, { operation: 'i18nInit' });
            throw error;
        }
    }

    async changeLanguage(lng) {
        try {
            await i18next.changeLanguage(lng);
            errorMonitoring.captureMessage(`Language changed to ${lng}`, 'info');
        } catch (error) {
            errorMonitoring.captureError(error, { operation: 'changeLanguage', language: lng });
            throw error;
        }
    }

    getCurrentLanguage() {
        return i18next.language;
    }

    getAvailableLanguages() {
        return i18next.languages;
    }

    t(key, options = {}) {
        return i18next.t(key, options);
    }
}

export const i18nManager = new I18nManager(); 