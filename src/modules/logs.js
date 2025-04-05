// Log data processing and management functions
import { tryParseJSONString } from './utils.js';
// Handle list_fires response
export async function handleListFiresResponse(fires, notifyPopup) {
    try {
        // Get current stored logs
        const storage = await chrome.storage.local.get(['logs']);
        const logs = storage.logs || [];
        let newLogs = 0;

        // Process each fire record
        for (const fire of fires) {
            const alertId = fire.alert_id;
            // Create log record
            const log = {
                id: fire.fire_id,
                alertId: alertId,
                timestamp: new Date(fire.fire_time).getTime(),
                name: fire.name,
                message: tryParseJSONString(fire.message),
                barTime: fire.bar_time,
            };

            // Check if log with same ID already exists
            const existingLogIndex = logs.findIndex(l => l.id === log.id);
            if (existingLogIndex === -1) {
                // Add new log
                logs.unshift(log);

                // Limit number of logs per alert
                const maxLogs = 100; // Can be adjusted as needed
                const alertLogs = logs.filter(l => l.alertId === alertId);
                if (alertLogs.length > maxLogs) {
                    // Remove oldest logs for this alert
                    const logsToRemove = alertLogs.length - maxLogs;
                    const oldestLogs = alertLogs.slice(-logsToRemove);
                    logs.splice(0, logs.length, ...logs.filter(l => !oldestLogs.includes(l)));
                }
                newLogs++;
            }
        }

        // Update storage
        await chrome.storage.local.set({ logs });

        // Notify popup to update
        notifyPopup('LOGS_UPDATED', logs);
        console.log(`New logs: ${newLogs}`);
    } catch (error) {
        console.error('Error processing list_fires response:', error);
    }
}

// Clean up old logs
export function cleanupOldLogs() {
    chrome.storage.local.get(['logs'], (result) => {
        const logs = result.logs || [];
        const now = Date.now();
        const updatedLogs = logs.filter(log => now - log.timestamp < 7 * 86400000); // Keep logs for 7 days
        chrome.storage.local.set({ logs: updatedLogs });
    });
}

// Get logs for a specific alert
export async function getLogsForAlert(alertId) {
    const storage = await chrome.storage.local.get(['logs']);
    const logs = storage.logs || [];
    return logs.filter(log => log.alertId === alertId);
}

// Get all logs
export async function getAllLogs() {
    const storage = await chrome.storage.local.get(['logs']);
    return storage.logs || [];
}

// Handle delete_fires response
export async function handleDeleteFiresResponse(fireIds, notifyPopup) {
    try {
        // Get current logs from storage
        const storage = await chrome.storage.local.get(['logs']);
        if (storage.logs) {
            // Filter out logs that match the fire_ids
            const updatedLogs = storage.logs.filter(log => !fireIds.includes(log.id));

            // Update storage with filtered logs
            await chrome.storage.local.set({ logs: updatedLogs });
            console.log(`Deleted ${fireIds.length} logs from storage`);

            // Notify popup to update
            notifyPopup('LOGS_UPDATED', updatedLogs);
        }
    } catch (error) {
        console.error('Error processing delete_fires request:', error);
    }
} 