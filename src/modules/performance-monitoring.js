import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';
import { errorMonitoring } from './error-monitoring';

class PerformanceMonitoring {
    constructor() {
        this.metrics = new Map();
    }

    init() {
        // Core Web Vitals
        getCLS(this.handleMetric.bind(this, 'CLS'));
        getFID(this.handleMetric.bind(this, 'FID'));
        getLCP(this.handleMetric.bind(this, 'LCP'));

        // Additional metrics
        getFCP(this.handleMetric.bind(this, 'FCP'));
        getTTFB(this.handleMetric.bind(this, 'TTFB'));

        // Custom performance marks
        this.setupCustomMarks();
    }

    handleMetric(name, metric) {
        this.metrics.set(name, metric);

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`${name}:`, metric);
        }

        // Report to error monitoring
        errorMonitoring.captureMessage(`Performance metric: ${name}`, 'info', {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            navigationType: metric.navigationType,
        });
    }

    setupCustomMarks() {
        // Mark important operations
        window.addEventListener('load', () => {
            performance.mark('pageLoad');
        });

        // Measure time between marks
        window.addEventListener('load', () => {
            performance.measure('pageLoadTime', 'navigationStart', 'pageLoad');
        });
    }

    startMeasure(name) {
        performance.mark(`${name}-start`);
    }

    endMeasure(name) {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
    }

    getMetrics() {
        return Object.fromEntries(this.metrics);
    }

    clearMetrics() {
        this.metrics.clear();
    }
}

export const performanceMonitoring = new PerformanceMonitoring(); 