// Alert data processing and management functions
import { tryParseJSONString } from './utils.js';

// Process alert data
export function processAlertData(alert) {
    try {
        // Parse symbol data
        const symbolStr = alert.symbol.startsWith('=') ? alert.symbol.substring(1) : alert.symbol;
        const symbolData = JSON.parse(symbolStr);
        const symbol = symbolData.symbol.symbol;
        const resolution = parseInt(alert.resolution);

        // Format ticker
        const ticker = `${symbol}, ${resolution >= 60 ? resolution / 60 + "h" : resolution}`;

        // Process message
        const processedMessage = tryParseJSONString(alert.message);

        // Get currency logos
        const quoteCurrencyLogo = alert.presentation_data?.main_series?.['currency-logoid'] || '';
        const baseCurrencyLogo = alert.presentation_data?.main_series?.['base-currency-logoid'] || '';

        // Process condition
        let condition = '';
        if (alert.condition) {
            if (alert.condition.type === 'cross') {
                const series = alert.condition.series;
                if (series.length === 2) {
                    condition = `${series[0].type} ${alert.condition.type} ${series[1][series[1].type]}`;
                }
            } else if (alert.condition.type === 'alert_cond') {
                const alertCondId = alert.condition.alert_cond_id;
                if (alert.presentation_data?.studies) {
                    for (const k in alert.presentation_data.studies) {
                        const v = alert.presentation_data.studies[k];
                        if (v.alert_conditions) {
                            for (const kk in v.alert_conditions) {
                                if (kk === alertCondId) {
                                    condition = v.alert_conditions[kk].text;
                                    break;
                                }
                            }
                        }
                        if (condition) break;
                    }
                }
            }
        }

        // Create alert object
        return {
            id: parseInt(alert.alert_id),
            name: alert.name,
            ticker: ticker,
            status: alert.active ? 'active' : 'inactive',
            description: processedMessage,
            lastTriggerTime: alert.last_fire_time,
            isEnabled: alert.active,
            resolution: resolution,
            symbol: symbol,
            quoteCurrencyLogo: quoteCurrencyLogo,
            baseCurrencyLogo: baseCurrencyLogo,
            condition: condition
        };
    } catch (error) {
        console.error('Error processing alert data:', error);
        console.error('Raw symbol data:', alert.symbol);
        return null;
    }
}

// Handle list_alerts response
export function handleListAlertsResponse(data, notifyPopup) {
    if (!Array.isArray(data.r)) {
        console.error('Invalid list_alerts response format:', data);
        return;
    }

    const processedAlerts = data.r
        .map(processAlertData)
        .filter(alert => alert !== null);

    chrome.storage.local.set({ alerts: processedAlerts }, () => {
        console.log(`Processed ${processedAlerts.length} alerts from list_alerts response`);
        notifyPopup('ALERTS_UPDATED', processedAlerts);
    });
}

// Handle create_alert response
export async function handleCreateAlertResponse(data, notifyPopup) {
    console.log('create_alert response:', data);
    if (!data.r) {
        console.error('Invalid create_alert response format:', data);
        return;
    }
    const alert = processAlertData(data.r);
    alert.status = 'active';
    const storage = await chrome.storage.local.get('alerts');
    const newAlerts = [alert, ...storage.alerts];
    chrome.storage.local.set({ alerts: newAlerts }, () => {
        console.log(`Processed ${newAlerts.length} alerts from create_alert response`);
        notifyPopup('ALERTS_UPDATED', newAlerts);
    });
}

// Handle modify_restart_alert response
export async function handleModifyRestartAlertResponse(data, notifyPopup) {
    console.log('modify_restart_alert response:', data);
    if (!data.r) {
        console.error('Invalid modify_restart_alert response format:', data);
        return;
    }
    const updatedAlert = processAlertData(data.r);
    updatedAlert.status = 'active';
    const storage = await chrome.storage.local.get('alerts');
    const newAlerts = storage.alerts.map(alert => alert.id === updatedAlert.id ? updatedAlert : alert);
    chrome.storage.local.set({ alerts: newAlerts }, () => {
        console.log(`Processed ${newAlerts.length} alerts from modify_restart_alert response`);
        notifyPopup('ALERTS_UPDATED', newAlerts);
    });
}

// Handle stop_alerts response
export async function handleStopAlertsResponse(requestData, notifyPopup) {
    try {
        const requestBody = JSON.parse(requestData.postData).payload;
        if (!Array.isArray(requestBody.alert_ids)) {
            console.error('Invalid stop_alerts request format:', requestBody);
            return;
        }

        const storage = await chrome.storage.local.get('alerts');
        const alerts = storage.alerts || [];

        const updatedAlerts = alerts.map(alert =>
            requestBody.alert_ids.includes(alert.id) ? { ...alert, status: 'inactive' } : alert
        );

        await chrome.storage.local.set({ alerts: updatedAlerts });
        notifyPopup('ALERTS_UPDATED', {
            alertIds: requestBody.alert_ids,
            action: 'stop'
        });
    } catch (error) {
        console.error('Error processing stop_alerts request:', error);
    }
}

// Handle restart_alerts response
export async function handleRestartAlertsResponse(requestData, notifyPopup) {
    try {
        const requestBody = JSON.parse(requestData.postData).payload;
        if (!Array.isArray(requestBody.alert_ids)) {
            console.error('Invalid restart_alerts request format:', requestBody);
            return;
        }

        const storage = await chrome.storage.local.get('alerts');
        const alerts = storage.alerts || [];

        const updatedAlerts = alerts.map(alert =>
            requestBody.alert_ids.includes(alert.id) ? { ...alert, status: 'active' } : alert
        );

        await chrome.storage.local.set({ alerts: updatedAlerts });
        notifyPopup('ALERTS_UPDATED', {
            alertIds: requestBody.alert_ids,
            action: 'restart'
        });
    } catch (error) {
        console.error('Error processing restart_alerts request:', error);
    }
}

// Handle delete_alerts response
export async function handleDeleteAlertsResponse(requestData, notifyPopup) {
    try {
        const requestBody = JSON.parse(requestData.postData).payload;
        if (!Array.isArray(requestBody.alert_ids)) {
            console.error('Invalid delete_alerts request format:', requestBody);
            return;
        }

        const storage = await chrome.storage.local.get('alerts');
        const alerts = storage.alerts || [];

        const updatedAlerts = alerts.filter(alert =>
            !requestBody.alert_ids.includes(alert.id)
        );

        await chrome.storage.local.set({ alerts: updatedAlerts });
        notifyPopup('ALERTS_UPDATED', {
            alertIds: requestBody.alert_ids,
            action: 'delete'
        });
    } catch (error) {
        console.error('Error processing delete_alerts request:', error);
    }
}
// TradingView Page Selectors
export const SELECTORS = {
    // Page Elements
    CHART_CONTAINER: '.chart-container',
    ALERTS_BUTTON: 'button[data-name="alerts"]',
    ALERTS_HEADER_TABS: '#AlertsHeaderTabs > button',
    ALERTS_CONTAINER: 'div[class="widgetbar-page active"] div[class="widgetbar-widgetbody"] div[class^="list-"]',
    SCROLLABLE_CONTAINER: '[class*="scrollable"]',

    // Alert Related Elements
    ALERT_ITEMS: 'div[class^="itemBody-"]:not([data-name="alert-log-item"])',
    ALERT_ITEM_NAME: 'div[data-name="alert-item-name"]',
    ALERT_ITEM_TICKER: 'div[data-name="alert-item-ticker"]',
    ALERT_ITEM_DESCRIPTION: 'div[data-name="alert-item-description"]',
    ALERT_ITEM_STATUS: 'span[data-name="alert-item-status"]',
    ALERT_ITEM_TIME: 'span[data-name="alert-item-time"]',
    ALERT_EDIT_BUTTON: 'div[data-name="alert-edit-button"]',
    ALERT_STOP_BUTTON: 'div[data-name="alert-stop-button"]',
    ALERT_RESTART_BUTTON: 'div[data-name="alert-restart-button"]',
    ALERT_DELETE_BUTTON: 'div[data-name="alert-delete-button"]',
    ALERT_CREATE_BUTTON: 'button[id="header-toolbar-alerts"]',
    ALERT_CREATE_DIALOG: 'div[data-name="alerts-create-edit-dialog"]',

    // Logo Related
    ALERT_LOGO: 'img[class^="logo-"]'
};

/**
 * Scroll page to get all alerts
 * @returns {Promise<Array>} alerts
 */
const getAllAlertsByScrollPage = async () => {
    // Get alerts container
    const alertsContainer = document.querySelector(SELECTORS.ALERTS_CONTAINER);
    if (!alertsContainer) return [];

    // Get scrollable container
    const scrollableContainer = alertsContainer.querySelector(SELECTORS.SCROLLABLE_CONTAINER) || alertsContainer;

    // Trigger mouse events
    function triggerMouseEvents() {
        const rect = scrollableContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseoverEvent = new MouseEvent('mouseover', {
            bubbles: true,
            cancelable: true,
            clientX: centerX,
            clientY: centerY
        });
        scrollableContainer.dispatchEvent(mouseoverEvent);

        const mousemoveEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: centerX,
            clientY: centerY
        });
        scrollableContainer.dispatchEvent(mousemoveEvent);
    }

    // Get current alerts
    function getCurrentAlerts() {
        return document.querySelectorAll(SELECTORS.ALERT_ITEMS);
    }

    // Get alert ID
    function getAlertId(alert) {
        const name = alert.querySelector(SELECTORS.ALERT_ITEM_NAME)?.textContent || '';
        const ticker = alert.querySelector(SELECTORS.ALERT_ITEM_TICKER)?.textContent || '';
        return generateAlertId(name, ticker);
    }

    async function scroll(topToBottom = true) {
        // Store alerts data
        const alertsMap = new Map();
        const uniqueAlertIds = new Set();

        // Scroll to get data
        while (true) {
            triggerMouseEvents();

            // Get all child elements
            const currentAlerts = getCurrentAlerts();
            if (currentAlerts.length === 0) break;

            // Check if there are new alerts
            const ids = [];
            currentAlerts.forEach(alert => {
                const alertId = getAlertId(alert);
                ids.push(alertId);
            });
            const uniqueIds = generateAlertId(ids.join(','));

            if (uniqueAlertIds.has(uniqueIds)) {
                console.log('No new alerts found, stopping scroll');
                break;
            }

            // Save new alerts
            currentAlerts.forEach(alert => {
                const alertId = getAlertId(alert);
                alertsMap.set(alertId, alert);
            });
            uniqueAlertIds.add(uniqueIds);

            // Scroll to last element
            currentAlerts[topToBottom ? currentAlerts.length - 1 : 0].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            // Wait for scroll to complete and content to load
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return alertsMap;
    }

    // scroll to bottom
    const alertsMap1 = await scroll(true);
    const alertsMap2 = await scroll(false);
    const alertsMap = new Map([...alertsMap1, ...alertsMap2]);
    return Array.from(alertsMap.values());
};
