import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';

class ErrorMonitoring {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            integrations: [
                new BrowserTracing({
                    tracePropagationTargets: ['localhost', /^https:\/\/tradingview\.com/],
                }),
            ],
            tracesSampleRate: 1.0,
            environment: process.env.NODE_ENV,
        });

        this.initialized = true;
    }

    captureError(error, context = {}) {
        if (!this.initialized) {
            console.error('Error monitoring not initialized:', error);
            return;
        }

        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
            Sentry.captureException(error);
        });
    }

    captureMessage(message, level = 'info', context = {}) {
        if (!this.initialized) {
            console.log('Message not captured:', message);
            return;
        }

        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
            Sentry.captureMessage(message, level);
        });
    }

    setUser(user) {
        if (!this.initialized) return;
        Sentry.setUser(user);
    }

    clearUser() {
        if (!this.initialized) return;
        Sentry.setUser(null);
    }
}

export const errorMonitoring = new ErrorMonitoring(); 