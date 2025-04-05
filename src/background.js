// Background service core logic
import {
  handleListAlertsResponse,
  handleCreateAlertResponse,
  handleModifyRestartAlertResponse,
  handleStopAlertsResponse,
  handleRestartAlertsResponse,
  handleDeleteAlertsResponse
} from './modules/alerts.js';
import {
  handleListFiresResponse,
  cleanupOldLogs,
  handleDeleteFiresResponse
} from './modules/logs.js';

let lastProcessedTime = 0;
const DEBOUNCE_INTERVAL = 1000; // 1 second debounce

// Store request data
const pendingRequests = new Map();

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.includes('tradingview.com')) {
    attachDebugger(tabId);
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  detachDebugger(tabId);
});

// Attach debugger to tab
function attachDebugger(tabId) {
  chrome.debugger.attach({ tabId }, '1.3', () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to attach debugger:', chrome.runtime.lastError);
      return;
    }

    // Enable network tracking
    chrome.debugger.sendCommand({ tabId }, 'Network.enable', {}, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to enable network tracking:', chrome.runtime.lastError);
        return;
      }
      console.log('Network tracking enabled for tab:', tabId);
    });
  });
}

// Detach debugger
function detachDebugger(tabId) {
  chrome.debugger.detach({ tabId }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to detach debugger:', chrome.runtime.lastError);
      return;
    }
    console.log('Debugger detached from tab:', tabId);
  });
}

// Handle debugger events
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.requestWillBeSent') {
    handleNetworkRequest(source.tabId, params);
  } else if (method === 'Network.responseReceived') {
    handleNetworkResponse(source.tabId, params);
  }
});
const allowedUrls = [
  'pricealerts.tradingview.com/list_alerts',
  'pricealerts.tradingview.com/stop_alerts',
  'pricealerts.tradingview.com/restart_alerts',
  'pricealerts.tradingview.com/delete_alerts',
  'pricealerts.tradingview.com/create_alert',
  'pricealerts.tradingview.com/modify_restart_alert',
  'pricealerts.tradingview.com/list_fires',
  'pricealerts.tradingview.com/delete_fires',
];
function isAllowedUrl(url) {
  return allowedUrls.some(allowedUrl => url.includes(allowedUrl));
}
// Handle network request
function handleNetworkRequest(tabId, params) {
  const { requestId, request } = params;
  const { url } = request;

  // Check if it's a TradingView request
  if (!isAllowedUrl(url)) {
    return;
  }

  // Store request data
  console.log(`Stored request data for requestId: ${requestId} with url: ${url}`);
  pendingRequests.set(requestId, {
    url,
    postData: request.postData,
    timestamp: Date.now()
  });

  // Clean up request data after 10 seconds
  setTimeout(() => {
    if (pendingRequests.has(requestId)) {
      pendingRequests.delete(requestId);
      console.log(`Cleaned up request data for requestId: ${requestId}`);
    }
  }, 10000);
}

// Handle network response
async function handleNetworkResponse(tabId, params) {
  const { requestId, response } = params;
  const { url } = response;
  console.log(`Received response for requestId: ${requestId} with url: ${url}`);
  // Check if it's a TradingView request
  if (!isAllowedUrl(url)) {
    return;
  }

  // Debounce check
  const currentTime = Date.now();
  if (currentTime - lastProcessedTime < DEBOUNCE_INTERVAL) {
    return;
  }
  lastProcessedTime = currentTime;

  try {
    const responseData = await chrome.debugger.sendCommand(
      { tabId },
      'Network.getResponseBody',
      { requestId }
    );
    // Parse response data
    const data = JSON.parse(responseData.body);
    if (data.s !== 'ok') {
      console.error('Invalid response format:', data);
      return;
    }
    // Handle different endpoints
    if (url.includes('/list_alerts') || url.includes('/create_alert') || url.includes('/modify_restart_alert') || url.includes('/list_fires')) {
      try {
        // For list_alerts, we need to get response body

        if (url.includes('/list_alerts')) {
          handleListAlertsResponse(data, notifyPopup);
        } else if (url.includes('/create_alert')) {
          handleCreateAlertResponse(data, notifyPopup);
        } else if (url.includes('/modify_restart_alert')) {
          handleModifyRestartAlertResponse(data, notifyPopup);
        } else if (url.includes('/list_fires')) {
          try {
            if (Array.isArray(data.r)) {
              handleListFiresResponse(data.r, notifyPopup);
            }
          } catch (error) {
            // Handle specific error for missing response body
            if (error.code === -32000 && error.message === 'No resource with given identifier found') {
              console.log('Response body no longer available for request:', requestId);
              return;
            }
            throw error; // Re-throw other errors
          }
        }
      } catch (error) {
        // Handle specific error for missing response body
        if (error.code === -32000 && error.message === 'No resource with given identifier found') {
          console.log('Response body no longer available for request:', requestId);
          return;
        }
        throw error; // Re-throw other errors
      }
    } else {
      // Get request data
      const requestData = pendingRequests.get(requestId);
      if (!requestData) {
        console.error('No request data found for delete_fires request');
        return;
      }
      if (url.includes('/delete_fires')) {
        try {
          const payload = JSON.parse(requestData.postData);
          if (payload && Array.isArray(payload.fire_ids)) {
            handleDeleteFiresResponse(payload.fire_ids, notifyPopup);
          }
        } catch (error) {
          console.error('Error processing delete_fires request:', error);
        }
      } else if (url.includes('/stop_alerts')) {
        handleStopAlertsResponse(requestData, notifyPopup);
      } else if (url.includes('/restart_alerts')) {
        handleRestartAlertsResponse(requestData, notifyPopup);
      } else if (url.includes('/delete_alerts')) {
        handleDeleteAlertsResponse(requestData, notifyPopup);
      }
      pendingRequests.delete(requestId);
      console.log(`Processed and cleaned up request data for requestId: ${requestId}`);
    }
  } catch (error) {
    console.error('Error processing debugger response:', error);
    if (pendingRequests.has(requestId)) {
      pendingRequests.delete(requestId);
      console.log(`Cleaned up request data after error for requestId: ${requestId}`);
    }
  }
}

// Notify popup to update
function notifyPopup(type, data) {
  chrome.runtime.sendMessage({
    type,
    data
  }).catch(error => {
    // Ignore "Receiving end does not exist" error
    if (error.message !== 'Could not establish connection. Receiving end does not exist.') {
      console.error('Error sending message:', error);
    }
  });
}

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // Handle sync alerts request from popup
  if (request.action === 'SYNC_ALERTS_REQUEST') {
    // Get the current active tab
    try {
      // Make the request using the tab's context
      const response = await fetch("https://pricealerts.tradingview.com/list_alerts", {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.s === 'ok') {
        handleListAlertsResponse(data, notifyPopup);
        sendResponse({ success: true, data });
      } else {
        sendResponse({ success: false, error: data.errmsg || 'Failed to sync alerts' });
      }
    } catch (error) {
      console.error('Error syncing alerts:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }

  // Handle sync logs request from popup
  if (request.action === 'SYNC_LOGS_REQUEST') {
    try {
      // Function to fetch logs with pagination
      async function fetchLogs(before = null) {
        const payload = {
          payload: {
            limit: 50
          }
        };

        if (before) {
          payload.payload.before = before;
        }

        // Execute the fetch request in the context of the active tab
        const response = await chrome.scripting.executeScript({
          target: { tabId: request.tabId },
          func: async (payload) => {
            const response = await fetch('https://pricealerts.tradingview.com/list_fires', {
              method: 'POST',
              headers: {
                'Accept': '*/*',
                'Content-Type': 'text/plain;charset=UTF-8'
              },
              credentials: 'include',
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
          },
          args: [payload]
        });

        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }

        return response[0].result;
      }

      // Initial request
      let allLogs = [];
      let data = await fetchLogs();

      if (data.s === 'ok' && Array.isArray(data.r)) {
        allLogs = allLogs.concat(data.r);
        console.log(`fetch logs size: ${data.r.length}`)
        // If we got full page of logs, fetch more
        while (data.r.length === 50) {
          // Wait for 1 second before next request
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Get the last log's fire_id
          const lastLog = data.r[data.r.length - 1];
          data = await fetchLogs(lastLog.fire_id);

          if (data.s === 'ok' && Array.isArray(data.r)) {
            allLogs = allLogs.concat(data.r);
          } else {
            break;
          }
          console.log(`fetch logs size: ${data.r.length}`)
        }

        // Process all logs
        handleListFiresResponse(allLogs, notifyPopup);
        sendResponse({ success: true, data: allLogs });
      } else {
        sendResponse({ success: false, error: data.errmsg || 'Failed to sync logs' });
      }
    } catch (error) {
      console.error('Error syncing logs:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
  if (request.type == "CREATE_ALERT_REQUEST") {
    // Get the current active tab
    // Call content script to create new alert
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      func: () => {
        // This function will execute in TradingView page context
        document.querySelector('button[id="header-toolbar-alerts"]').click();
      },
      args: []
    });
    sendResponse({ success: true });
    return true; // Keep message channel open
  }
});

// Clean up old logs periodically
setInterval(cleanupOldLogs, 3600000); // Run every hour

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  try {
    if (details.reason === 'install') {
      // Initialize storage with default values
      chrome.storage.local.set({
        alerts: [],
        settings: {
          maxLogsPerAlert: 100,
          logRetentionDays: 7,
          notifications: true
        }
      });
    }
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log('Extension context invalidated, extension will be reloaded');
      return;
    }
    console.error('Error during extension installation:', error);
  }
});