import { findAlertByNameAndTicker, handleCreateAlert, SELECTORS } from './alertsManager.js';
import { handleListAlertsResponse } from './modules/alerts.js';

// Function to sync alerts from TradingView
async function syncAlerts() {
  try {
    const response = await fetch('https://pricealerts.tradingview.com/list_alerts', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Include cookies for authentication
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.s === 'ok') {
      handleListAlertsResponse(data, (type, data) => {
        chrome.runtime.sendMessage({ type, data });
      });
      return { success: true, message: 'Alerts synced successfully' };
    } else {
      return { success: false, error: data.errmsg || 'Failed to sync alerts' };
    }
  } catch (error) {
    console.error('Error syncing alerts:', error);
    return { success: false, error: error.message };
  }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CREATE_ALERT') {
    handleCreateAlert().then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'EDIT_ALERT') {
    handleEditAlert(message.data).then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'TOGGLE_ALERT') {
    handleToggleAlert(message.data).then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'DELETE_ALERT') {
    handleDeleteAlert(message.data).then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'SYNC_ALERTS') {
    syncAlerts().then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  }
  return false; // No async response needed
});

// Function to handle edit alert
async function handleEditAlert({ alertId, alertName, alertTicker }) {
  const alert = await findAlertByNameAndTicker(alertName, alertTicker);
  if (alert) {
    const editButton = alert.querySelector(SELECTORS.ALERT_EDIT_BUTTON);
    if (editButton) {
      editButton.click();
      return { success: true };
    }
    return { success: false, error: 'Edit button not found' };
  }
  return { success: false, error: 'Alert not found' };
}

// Function to handle toggle alert
async function handleToggleAlert({ alertId, alertName, alertTicker }) {
  const alert = await findAlertByNameAndTicker(alertName, alertTicker);
  if (alert) {
    const toggleButton = alert.querySelector(SELECTORS.ALERT_STOP_BUTTON) || alert.querySelector(SELECTORS.ALERT_RESTART_BUTTON);
    if (toggleButton) {
      toggleButton.click();
      return { success: true };
    }
    return { success: false, error: 'Toggle button not found' };
  }
  return { success: false, error: 'Alert not found' };
}

// Function to handle delete alert
async function handleDeleteAlert({ alertId, alertName, alertTicker }) {
  const alert = await findAlertByNameAndTicker(alertName, alertTicker);
  if (alert) {
    const deleteButton = alert.querySelector(SELECTORS.ALERT_DELETE_BUTTON);
    if (deleteButton) {
      deleteButton.click();
      return { success: true };
    }
    return { success: false, error: 'Delete button not found' };
  }
  return { success: false, error: 'Alert not found' };
}