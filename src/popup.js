// Import modules
import { type } from 'os';
import { getLogsForAlert } from './modules/logs.js';

// DOM Elements
const createAlertBtn = document.getElementById('createAlert');
const syncBtn = document.getElementById('syncBtn');
const alertsList = document.getElementById('alertsList');
const searchInput = document.getElementById('search');
const statusSearch = document.getElementById('statusSearch');
const validationRulesDropdown = document.querySelector('.validation-rules-dropdown');
const globalTooltip = document.getElementById('global-tooltip');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
const currentCountSpan = document.getElementById('currentCount');
const totalCountSpan = document.getElementById('totalCount');

// State
let currentAlerts = [];
let filteredAlerts = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortConfig = {
    column: null,
    direction: 'asc'
};

// Custom validation rules storage
let customValidationRules = {};

// Log View State
let currentLogs = [];
let currentLogPage = 1;
let currentAlertId = null;
let currentAlertName = null;
const logsPerPage = 10;

// DOM Elements for Log View
const alertsView = document.getElementById('alertsView');
const logsView = document.getElementById('logsView');
const backToAlertsBtn = document.getElementById('backToAlerts');
const logAlertName = document.getElementById('logAlertName');
const logsList = document.getElementById('logsList');
const prevLogPageBtn = document.getElementById('prevLogPage');
const nextLogPageBtn = document.getElementById('nextLogPage');
const currentLogPageSpan = document.getElementById('currentLogPage');
const totalLogPagesSpan = document.getElementById('totalLogPages');
const currentLogCountSpan = document.getElementById('currentLogCount');
const totalLogCountSpan = document.getElementById('totalLogCount');

// DOM Elements for Rule Validation
const validateBtn = document.getElementById('validateBtn');

// DOM Elements for Rule Creation
const createNewRuleBtn = document.getElementById('createNewRule');
const ruleDialog = document.getElementById('ruleDialog');
const ruleTypeSelect = document.getElementById('ruleType');
const ruleParams = document.getElementById('ruleParams');
const ruleDialogError = document.getElementById('ruleDialogError');
const cancelRuleBtn = document.getElementById('cancelRule');
const saveRuleBtn = document.getElementById('saveRule');

// Predefined validation functions
const validationFunctions = {
    'json_format': {
        name: 'JSON Format Check',
        validate: (alert) => {
            try {
                if (typeof alert.description === 'string') {
                    JSON.parse(alert.description);
                    return { pass: true };
                }
                return { pass: true };
            } catch (e) {
                return { pass: false, message: 'Invalid JSON format' };
            }
        }
    },
    'required_fields': {
        name: 'Required Fields Check',
        validate: (alert) => {
            const requiredFields = ['name', 'ticker', 'status'];
            const missingFields = requiredFields.filter(field => !alert[field]);
            if (missingFields.length > 0) {
                return { pass: false, message: `Missing required fields: ${missingFields.join(', ')}` };
            }
            return { pass: true };
        }
    },
    'price_format': {
        name: 'Price Format Check',
        validate: (alert) => {
            if (alert.description && typeof alert.description === 'string') {
                try {
                    const desc = JSON.parse(alert.description);
                    if (desc.price && isNaN(parseFloat(desc.price))) {
                        return { pass: false, message: 'Price must be a valid number' };
                    }
                } catch (e) {
                    return { pass: false, message: 'Invalid price format' };
                }
            }
            return { pass: true };
        }
    },
    'timeframe_check': {
        name: 'Timeframe Check',
        validate: (alert) => {
            if (alert.description && typeof alert.description === 'string') {
                try {
                    const desc = JSON.parse(alert.description);
                    const validTimeframes = ['1', '3', '5', '15', '30', '60', '240', 'D', 'W', 'M'];
                    if (desc.timeframe && !validTimeframes.includes(desc.timeframe)) {
                        return { pass: false, message: 'Invalid timeframe' };
                    }
                } catch (e) {
                    return { pass: false, message: 'Invalid timeframe format' };
                }
            }
            return { pass: true };
        }
    }
};

// Validation rule builder
const ValidationRuleBuilder = {
    // Basic operators
    operators: {
        and: (...rules) => (alert) => {
            const results = rules.map(rule => rule(alert));
            const failedResults = results.filter(result => !result.pass);
            if (failedResults.length > 0) {
                return { pass: false, message: failedResults.map(r => r.message).join(' AND ') };
            }
            return { pass: true };
        },
        or: (...rules) => (alert) => {
            const results = rules.map(rule => rule(alert));
            const passedResults = results.filter(result => result.pass);
            if (passedResults.length === 0) {
                return { pass: false, message: results.map(r => r.message).join(' OR ') };
            }
            return { pass: true };
        },
        not: (rule) => (alert) => {
            const result = rule(alert);
            return { pass: !result.pass, message: `NOT (${result.message})` };
        }
    },

    // Field validators
    fieldValidators: {
        required: (field, message) => (alert) => {
            if (!alert[field]) {
                return { pass: false, message: message || `Field '${field}' is required` };
            }
            return { pass: true };
        },
        type: (field, expectedType, message) => (alert) => {
            if (alert[field] && typeof alert[field] !== expectedType) {
                return { pass: false, message: message || `Field '${field}' must be of type ${expectedType}` };
            }
            return { pass: true };
        },
        pattern: (field, pattern, message) => (alert) => {
            if (alert[field] && !pattern.test(alert[field])) {
                return { pass: false, message: message || `Field '${field}' does not match pattern` };
            }
            return { pass: true };
        },
        range: (field, min, max, message) => (alert) => {
            const value = parseFloat(alert[field]);
            if (alert[field] && (isNaN(value) || value < min || value > max)) {
                return { pass: false, message: message || `Field '${field}' must be between ${min} and ${max}` };
            }
            return { pass: true };
        }
    },

    // JSON description validators
    descriptionValidators: {
        requiredField: (field, message) => (alert) => {
            if (alert.description && typeof alert.description === 'string') {
                try {
                    const desc = JSON.parse(alert.description);
                    if (!desc[field]) {
                        return { pass: false, message: message || `Description must contain field '${field}'` };
                    }
                } catch (e) {
                    return { pass: false, message: 'Invalid JSON format' };
                }
            }
            return { pass: true };
        },
        fieldType: (field, expectedType, message) => (alert) => {
            if (alert.description && typeof alert.description === 'string') {
                try {
                    const desc = JSON.parse(alert.description);
                    if (desc[field] && typeof desc[field] !== expectedType) {
                        return { pass: false, message: message || `Description field '${field}' must be of type ${expectedType}` };
                    }
                } catch (e) {
                    return { pass: false, message: 'Invalid JSON format' };
                }
            }
            return { pass: true };
        },
        fieldPattern: (field, pattern, message) => (alert) => {
            if (alert.description && typeof alert.description === 'string') {
                try {
                    const desc = JSON.parse(alert.description);
                    if (desc[field] && !pattern.test(desc[field])) {
                        return { pass: false, message: message || `Description field '${field}' does not match pattern` };
                    }
                } catch (e) {
                    return { pass: false, message: 'Invalid JSON format' };
                }
            }
            return { pass: true };
        }
    },

    // Create a new validation rule
    createRule: (name, validate) => ({
        name,
        validate
    })
};

// Available alert fields for validation
const alertFields = {
    basic: [
        { id: 'name', label: 'Name' },
        { id: 'ticker', label: 'Ticker' },
        { id: 'status', label: 'Status' },
        { id: 'description', label: 'Description' }
    ],
    description: [
        { id: 'data.action', label: 'Action' }
    ]
};

// Function to create field selector
function createFieldSelector(id, label, includeDescription = true) {
    const container = document.createElement('div');
    container.className = 'form-group field-selector';

    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;

    const select = document.createElement('select');
    select.id = id;
    select.className = 'form-control field-select';

    // Add basic fields
    const basicGroup = document.createElement('optgroup');
    basicGroup.label = 'Basic Fields';
    alertFields.basic.forEach(field => {
        const option = document.createElement('option');
        option.value = field.id;
        option.textContent = field.label;
        basicGroup.appendChild(option);
    });
    select.appendChild(basicGroup);

    // Add description fields if needed
    if (includeDescription) {
        const descGroup = document.createElement('optgroup');
        descGroup.label = 'Description Fields';
        alertFields.description.forEach(field => {
            const option = document.createElement('option');
            option.value = `description.${field.id}`;
            option.textContent = `Description.${field.label}`;
            descGroup.appendChild(option);
        });
        select.appendChild(descGroup);
    }

    container.appendChild(labelElement);
    container.appendChild(select);

    return container;
}

// Function to update rule parameters based on selected type
function updateRuleParams() {
    const type = ruleTypeSelect.value;
    let html = '';

    switch (type) {
        case 'field_required':
            html = `
                <div class="form-group">
                    <label for="field">Field Name</label>
                    <input type="text" id="field" class="form-control" placeholder="Enter field name">
                </div>
                <div class="form-group">
                    <label for="message">Error Message</label>
                    <input type="text" id="message" class="form-control" placeholder="Enter error message">
                </div>
            `;
            break;
        case 'field_type':
            html = `
                <div class="form-group">
                    <label for="field">Field Name</label>
                    <input type="text" id="field" class="form-control" placeholder="Enter field name">
                </div>
                <div class="form-group">
                    <label for="type">Expected Type</label>
                    <select id="type" class="form-control">
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="object">Object</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="message">Error Message</label>
                    <input type="text" id="message" class="form-control" placeholder="Enter error message">
                </div>
            `;
            break;
        case 'field_pattern':
            html = `
                <div class="form-group">
                    <label for="field">Field Name</label>
                    <input type="text" id="field" class="form-control" placeholder="Enter field name">
                </div>
                <div class="form-group">
                    <label for="pattern">Regular Expression</label>
                    <input type="text" id="pattern" class="form-control" placeholder="Enter regex pattern">
                </div>
                <div class="form-group">
                    <label for="message">Error Message</label>
                    <input type="text" id="message" class="form-control" placeholder="Enter error message">
                </div>
            `;
            break;
        case 'field_range':
            html = `
                <div class="form-group">
                    <label for="field">Field Name</label>
                    <input type="text" id="field" class="form-control" placeholder="Enter field name">
                </div>
                <div class="form-group">
                    <label for="min">Minimum Value</label>
                    <input type="number" id="min" class="form-control" placeholder="Enter minimum value">
                </div>
                <div class="form-group">
                    <label for="max">Maximum Value</label>
                    <input type="number" id="max" class="form-control" placeholder="Enter maximum value">
                </div>
                <div class="form-group">
                    <label for="message">Error Message</label>
                    <input type="text" id="message" class="form-control" placeholder="Enter error message">
                </div>
            `;
            break;
        case 'field_relation':
            html = `
                <div class="form-group">
                    <label for="field1">Field 1 Name</label>
                    <input type="text" id="field1" class="form-control" placeholder="Enter first field name">
                </div>
                <div class="form-group">
                    <label for="operator1">Operator</label>
                    <select id="operator1" class="form-control">
                        <option value="==">Equals (==)</option>
                        <option value="!=">Not Equals (!=)</option>
                        <option value=">">Greater Than (>)</option>
                        <option value="<">Less Than (<)</option>
                        <option value=">=">Greater Than or Equal (>=)</option>
                        <option value="<=">Less Than or Equal (<=)</option>
                        <option value="in">In List</option>
                        <option value="not_in">Not In List</option>
                    </select>
                </div>
                <div class="form-group" id="value1InputGroup">
                    <label for="value1">Value</label>
                    <input type="text" id="value1" class="form-control" placeholder="Enter value">
                </div>
                <div class="form-group" id="value1ListGroup" style="display: none;">
                    <label for="value1List">Values (comma-separated)</label>
                    <input type="text" id="value1List" class="form-control" placeholder="Enter values separated by commas">
                </div>
                <div class="form-group">
                    <label for="then">Then</label>
                    <select id="then" class="form-control">
                        <option value="must">Must</option>
                        <option value="must_not">Must Not</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="field2">Field 2 Name</label>
                    <input type="text" id="field2" class="form-control" placeholder="Enter second field name">
                </div>
                <div class="form-group">
                    <label for="operator2">Operator</label>
                    <select id="operator2" class="form-control">
                        <option value="==">Equals (==)</option>
                        <option value="!=">Not Equals (!=)</option>
                        <option value=">">Greater Than (>)</option>
                        <option value="<">Less Than (<)</option>
                        <option value=">=">Greater Than or Equal (>=)</option>
                        <option value="<=">Less Than or Equal (<=)</option>
                        <option value="in">In List</option>
                        <option value="not_in">Not In List</option>
                    </select>
                </div>
                <div class="form-group" id="value2InputGroup">
                    <label for="value2">Value</label>
                    <input type="text" id="value2" class="form-control" placeholder="Enter value">
                </div>
                <div class="form-group" id="value2ListGroup" style="display: none;">
                    <label for="value2List">Values (comma-separated)</label>
                    <input type="text" id="value2List" class="form-control" placeholder="Enter values separated by commas">
                </div>
                <div class="form-group">
                    <label for="message">Error Message</label>
                    <input type="text" id="message" class="form-control" placeholder="Enter error message">
                </div>
            `;
            break;
    }

    ruleParams.innerHTML = html;

    // Add event listeners for field relation operators
    if (type === 'field_relation') {
        const operator1Select = document.getElementById('operator1');
        const value1InputGroup = document.getElementById('value1InputGroup');
        const value1ListGroup = document.getElementById('value1ListGroup');
        const operator2Select = document.getElementById('operator2');
        const value2InputGroup = document.getElementById('value2InputGroup');
        const value2ListGroup = document.getElementById('value2ListGroup');

        operator1Select.addEventListener('change', () => {
            const isListOperator = operator1Select.value === 'in' || operator1Select.value === 'not_in';
            value1InputGroup.style.display = isListOperator ? 'none' : 'block';
            value1ListGroup.style.display = isListOperator ? 'block' : 'none';
        });

        operator2Select.addEventListener('change', () => {
            const isListOperator = operator2Select.value === 'in' || operator2Select.value === 'not_in';
            value2InputGroup.style.display = isListOperator ? 'none' : 'block';
            value2ListGroup.style.display = isListOperator ? 'block' : 'none';
        });
    }
}

// Function to get field value from alert object
function getFieldValue(alert, fieldPath) {
    if (!fieldPath) return null;

    const parts = fieldPath.split('.');
    let value = alert;

    for (const part of parts) {
        value = value[part];
        if (value === undefined) return null;
    }

    return value;
}

// Function to create custom rule
function createCustomRule(name, config) {
    const { type, params } = config;
    let validate;

    switch (type) {
        case 'field_required':
            validate = (alert) => {
                const value = getFieldValue(alert, params.field);
                if (value === null || value === undefined || value === '') {
                    return { pass: false, message: params.message || `Field '${params.field}' is required` };
                }
                return { pass: true };
            };
            break;
        case 'field_type':
            validate = (alert) => {
                const value = getFieldValue(alert, params.field);
                if (value !== null && typeof value !== params.type) {
                    return { pass: false, message: params.message || `Field '${params.field}' must be of type ${params.type}` };
                }
                return { pass: true };
            };
            break;
        case 'field_pattern':
            validate = (alert) => {
                const value = getFieldValue(alert, params.field);
                if (value && !new RegExp(params.pattern).test(value)) {
                    return { pass: false, message: params.message || `Field '${params.field}' does not match pattern` };
                }
                return { pass: true };
            };
            break;
        case 'field_range':
            validate = (alert) => {
                const value = getFieldValue(alert, params.field);
                if (value !== null) {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue < params.min || numValue > params.max) {
                        return { pass: false, message: params.message || `Field '${params.field}' must be between ${params.min} and ${params.max}` };
                    }
                }
                return { pass: true };
            };
            break;
        case 'field_relation':
            validate = (alert) => {
                const value1 = getFieldValue(alert, params.field1);
                const value2 = getFieldValue(alert, params.field2);

                // Check if condition is met
                let conditionMet = false;
                switch (params.operator1) {
                    case '==':
                        conditionMet = value1 == params.value1;
                        break;
                    case '!=':
                        conditionMet = value1 != params.value1;
                        break;
                    case '>':
                        conditionMet = parseFloat(value1) > parseFloat(params.value1);
                        break;
                    case '<':
                        conditionMet = parseFloat(value1) < parseFloat(params.value1);
                        break;
                    case '>=':
                        conditionMet = parseFloat(value1) >= parseFloat(params.value1);
                        break;
                    case '<=':
                        conditionMet = parseFloat(value1) <= parseFloat(params.value1);
                        break;
                    case 'in':
                        const values1 = params.value1List.split(',').map(v => v.trim());
                        conditionMet = values1.includes(value1.toString());
                        break;
                    case 'not_in':
                        const notValues1 = params.value1List.split(',').map(v => v.trim());
                        conditionMet = !notValues1.includes(value1.toString());
                        break;
                }

                // Check if 'then' condition is met
                let thenConditionMet = false;
                switch (params.operator2) {
                    case '==':
                        thenConditionMet = value2 == params.value2;
                        break;
                    case '!=':
                        thenConditionMet = value2 != params.value2;
                        break;
                    case '>':
                        thenConditionMet = parseFloat(value2) > parseFloat(params.value2);
                        break;
                    case '<':
                        thenConditionMet = parseFloat(value2) < parseFloat(params.value2);
                        break;
                    case '>=':
                        thenConditionMet = parseFloat(value2) >= parseFloat(params.value2);
                        break;
                    case '<=':
                        thenConditionMet = parseFloat(value2) <= parseFloat(params.value2);
                        break;
                    case 'in':
                        const values2 = params.value2List.split(',').map(v => v.trim());
                        thenConditionMet = values2.includes(value2.toString());
                        break;
                    case 'not_in':
                        const notValues2 = params.value2List.split(',').map(v => v.trim());
                        thenConditionMet = !notValues2.includes(value2.toString());
                        break;
                }
                let finalResult = false;
                if (params.then === 'must') {
                    finalResult = conditionMet ? thenConditionMet : true;
                } else if (params.then === 'must_not') {
                    finalResult = conditionMet ? !thenConditionMet : true;
                }
                return {
                    pass: finalResult,
                    message: params.message || `Field relation validation failed`
                };
            };
            break;
        default:
            validate = () => ({ pass: true });
    }

    return {
        name,
        config,
        validate
    };
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Ensure rule dialog is hidden on load
    if (ruleDialog) {
        ruleDialog.style.display = 'none';
    }

    createAlertBtn.addEventListener('click', createAlert);
    syncBtn.addEventListener('click', sync);
    searchInput.addEventListener('input', filterAlerts);
    statusSearch.addEventListener('change', filterAlerts);
    prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));

    // Load alerts from storage when popup opens
    loadAlertsFromStorage();

    backToAlertsBtn.addEventListener('click', showAlertsView);
    prevLogPageBtn.addEventListener('click', () => changeLogPage(currentLogPage - 1));
    nextLogPageBtn.addEventListener('click', () => changeLogPage(currentLogPage + 1));

    // Add validation rules dropdown event listeners
    if (validationRulesDropdown) {
        const dropdownHeader = validationRulesDropdown.querySelector('.dropdown-header');
        dropdownHeader.addEventListener('click', () => {
            validationRulesDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!validationRulesDropdown.contains(event.target)) {
                validationRulesDropdown.classList.remove('active');
            }
        });

        // Prevent dropdown from closing when clicking inside
        validationRulesDropdown.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

    // Add rule validation event listeners
    validateBtn.addEventListener('click', validateSelectedAlerts);

    // Add rule creation event listeners
    createNewRuleBtn.addEventListener('click', showRuleDialog);
    ruleTypeSelect.addEventListener('change', updateRuleParams);
    cancelRuleBtn.addEventListener('click', hideRuleDialog);
    saveRuleBtn.addEventListener('click', saveNewRule);

    // Load custom validation rules from storage
    loadCustomValidationRules();
});

// Function to change page
function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredAlerts.length / itemsPerPage)) return;

    currentPage = page;
    updatePagination();
    displayAlerts(getCurrentPageAlerts());
}

// Function to get current page alerts
function getCurrentPageAlerts() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAlerts.slice(startIndex, endIndex);
}

// Function to update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);

    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    currentCountSpan.textContent = Math.min(currentPage * itemsPerPage, filteredAlerts.length);
    totalCountSpan.textContent = filteredAlerts.length;
}

// Function to filter alerts based on search criteria
function filterAlerts() {
    const searchQuery = searchInput.value.toLowerCase();
    const statusQuery = statusSearch.value.toLowerCase();

    filteredAlerts = currentAlerts.filter(alert => {
        const nameMatch = alert.name?.toLowerCase().includes(searchQuery);
        const tickerMatch = alert.ticker?.toLowerCase().includes(searchQuery);
        const conditionMatch = alert.condition?.toLowerCase().includes(searchQuery);
        const statusMatch = !statusQuery || alert.status?.toLowerCase() === statusQuery;
        return (nameMatch || tickerMatch || conditionMatch) && statusMatch;
    });

    currentPage = 1; // Reset to first page when filtering
    updatePagination();
    displayAlerts(getCurrentPageAlerts());
}

// Function to load alerts from storage
function loadAlertsFromStorage() {
    chrome.storage.local.get(['alerts'], (result) => {
        try {
            // 确保 result.alerts 是数组
            const alerts = Array.isArray(result.alerts) ? result.alerts : [];
            currentAlerts = alerts;
            filteredAlerts = alerts;

            // 更新分页
            updatePagination();

            // 显示警报
            displayAlerts(getCurrentPageAlerts());
        } catch (error) {
            console.error('Error loading alerts from storage:', error);
            // 显示错误消息
            alertsList.innerHTML = '<div class="alert alert-danger">Error loading alerts. Please try again.</div>';
        }
    });
}

// Function to get the current active tab
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// Function to create alert
async function createAlert() {
    try {
        const tab = await getCurrentTab();
        console.log(`tab id: ${tab.id} and tab url: ${tab.url}`);
        createAlertBtn.disabled = true;
        alertsList.innerHTML = '<div class="loading">Creating alert...</div>';
        // Then send the message to create alert
        chrome.runtime.sendMessage({ type: 'CREATE_ALERT_REQUEST', tabId: tab.id }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
                alertsList.innerHTML = `<div class="error">Error: ${chrome.runtime.lastError.message}</div>`;
            }
            createAlertBtn.disabled = false;
            window.close();
        });
    } catch (error) {
        console.error('Error in createAlert:', error);
        alertsList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        createAlertBtn.disabled = false;
    }
}

// Function to sync page
async function sync() {
    try {
        const tab = await getCurrentTab();
        if (!tab.url.includes('tradingview.com')) {
            alertsList.innerHTML = '<div class="error">Please open a TradingView chart page first.</div>';
            return;
        }

        syncBtn.disabled = true;
        alertsList.innerHTML = '<div class="loading">Syncing...</div>';
        chrome.runtime.sendMessage({ action: 'SYNC_ALERTS_REQUEST', tabId: tab.id }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
                alertsList.innerHTML = `<div class="error">Error: ${chrome.runtime.lastError.message}</div>`;
            }
        });
        chrome.runtime.sendMessage({ action: 'SYNC_LOGS_REQUEST', tabId: tab.id }, (response) => {

            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
                alertsList.innerHTML = `<div class="error">Error: ${chrome.runtime.lastError.message}</div>`;
            }
            syncBtn.disabled = false;
        });

    } catch (error) {
        console.error('Error in sync:', error);
        alertsList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        syncBtn.disabled = false;
    }
}
// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ALERTS_UPDATED') {
        // 更新警报数据
        if (Array.isArray(message.data)) {
            // 处理完整的警报列表更新
            currentAlerts = message.data;
            filteredAlerts = message.data;
            updatePagination();
            displayAlerts(getCurrentPageAlerts());
        } else if (message.data.alertIds && message.data.action) {
            // 处理单个操作（停止、重启、删除）
            const { alertIds, action } = message.data;
            highlightUpdatedAlerts(alertIds, action);
            loadAlertsFromStorage();
        }
    }
});

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// Function to sort alerts
function sortAlerts(alerts, column, direction) {
    return [...alerts].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];

        // Handle special cases for date columns
        if (column === 'lastTriggerTime' || column === 'lastUpdated') {
            aValue = aValue ? new Date(aValue).getTime() : 0;
            bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // Convert to lowercase for case-insensitive string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        // Compare values
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Function to handle column sorting
function handleSort(column) {
    if (sortConfig.column === column) {
        // If clicking the same column, toggle direction
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // If clicking a new column, set it as sort column with ascending direction
        sortConfig.column = column;
        sortConfig.direction = 'asc';
    }

    // Sort the filtered alerts
    filteredAlerts = sortAlerts(filteredAlerts, sortConfig.column, sortConfig.direction);

    // Update the display
    displayAlerts(getCurrentPageAlerts());
}

// Function to display alerts
function displayAlerts(alerts) {
    const alertsList = document.getElementById('alertsList');

    // 创建表头
    const tableHeader = `
    <table class="alerts-table">
      <thead>
        <tr>
          <th>
            <input type="checkbox" id="selectAll" class="alert-checkbox">
          </th>
          <th class="sortable ${sortConfig.column === 'name' ? 'sorted' : ''}" data-column="name">
            Name <span class="sort-indicator">↕</span>
            <span class="sort-direction">${sortConfig.column === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
          </th>
          <th>Status</th>
          <th class="sortable ${sortConfig.column === 'ticker' ? 'sorted' : ''}" data-column="ticker">
            Ticker <span class="sort-indicator">↕</span>
            <span class="sort-direction">${sortConfig.column === 'ticker' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
          </th>
          <th class="sortable ${sortConfig.column === 'condition' ? 'sorted' : ''}" data-column="condition">
            Condition <span class="sort-indicator">↕</span>
            <span class="sort-direction">${sortConfig.column === 'condition' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
          </th>
          <th>Description</th>
          <th class="sortable ${sortConfig.column === 'lastTriggerTime' ? 'sorted' : ''}" data-column="lastTriggerTime">
            Last Trigger <span class="sort-indicator">↕</span>
            <span class="sort-direction">${sortConfig.column === 'lastTriggerTime' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
          </th>
          <th class="validation-column" style="display: none;">Validation</th>
        </tr>
      </thead>
      <tbody>
    `;

    // 检查 alerts 是否有效
    if (!alerts || !Array.isArray(alerts)) {
        alertsList.innerHTML = tableHeader + `
          <tr>
            <td colspan="6" class="error-message">
              <div class="alert alert-danger">Error loading alerts. Please try again.</div>
            </td>
          </tr>
        </tbody>
        </table>`;
        return;
    }

    if (alerts.length === 0) {
        alertsList.innerHTML = tableHeader + `
          <tr>
            <td colspan="6" class="info-message">
              <div class="alert alert-info">No alerts found.</div>
            </td>
          </tr>
        </tbody>
        </table>`;
        return;
    }

    // 如果有数据，显示完整的表格
    alertsList.innerHTML = tableHeader + alerts.map(alert => {
        // 确保 alert 对象存在且包含必要的属性
        if (!alert) {
            console.error('Invalid alert object:', alert);
            return '';
        }

        // 安全地获取属性值，提供默认值
        const name = alert.name || '';
        const status = alert.status || '';
        const ticker = alert.ticker || '';
        const condition = alert.condition || '';
        const description = alert.description || '';
        const lastTriggerTime = alert.lastTriggerTime;
        const lastUpdated = alert.lastUpdated;
        const baseCurrencyLogo = alert.baseCurrencyLogo || '';
        const quoteCurrencyLogo = alert.quoteCurrencyLogo || '';

        // Create logo HTML
        const logoHTML = `
            <div class="logo-cell">
                <img src="https://s3-symbol-logo.tradingview.com/${baseCurrencyLogo}.svg" alt="base currency">
                <img src="https://s3-symbol-logo.tradingview.com/${quoteCurrencyLogo}.svg" alt="quote currency">
            </div>
        `;

        // Format description for display
        let displayDescription = '';
        let tooltipContent = '';
        if (typeof description === 'object') {
            displayDescription = JSON.stringify(description, null, 2);
            tooltipContent = JSON.stringify(description, null, 2);
        } else {
            displayDescription = description;
            tooltipContent = description;
        }

        // Truncate alert name to 80 characters and add tooltip
        const truncatedName = name.length > 60 ? name.substring(0, 60) + '...' : name;
        const nameTooltip = name.length > 60 ? name : '';

        // Truncate description for display
        const truncatedDescription = displayDescription.length > 50 ? displayDescription.substring(0, 50) + '...' : displayDescription;

        // Format lastTriggerTime as a clickable link if it exists
        const lastTriggerCell = lastTriggerTime ?
            `<a href="#" class="trigger-link" data-alert-id="${alert.id}" data-alert-name="${escapeHtml(name)}">${formatDate(lastTriggerTime)}</a>` :
            '-';

        return `
            <tr data-alert-id="${escapeHtml(alert.id || '')}" data-alert-name="${escapeHtml(name)}" data-alert-ticker="${escapeHtml(ticker)}">
                <td>
                    <input type="checkbox" class="alert-checkbox" data-alert-id="${escapeHtml(alert.id || '')}">
                </td>
                <td class="name-cell" data-tooltip="${escapeHtml(nameTooltip)}">${escapeHtml(truncatedName)}</td>
                <td><span class="status-badge ${status}">${escapeHtml(status)}</span></td>
                <td>${logoHTML}${escapeHtml(ticker)}</td>
                <td class="condition-cell" data-tooltip="${escapeHtml(condition)}">${escapeHtml(condition)}</td>
                <td class="description-cell" data-tooltip="${escapeHtml(tooltipContent)}">
                    ${escapeHtml(truncatedDescription)}
                </td>
                <td>${lastTriggerCell}</td>
                <td>${lastUpdated ? formatDate(lastUpdated) : '-'}</td>
                <td class="validation-status" style="display: none;"></td>
            </tr>
        `;
    }).join('') + '</tbody></table>';

    // Add sorting event listeners
    const sortHeaders = alertsList.querySelectorAll('.sortable');
    sortHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            handleSort(column);
        });
    });

    // Add tooltip event listeners
    const tooltipCells = alertsList.querySelectorAll('[data-tooltip]');
    tooltipCells.forEach(cell => {
        cell.addEventListener('mouseenter', showTooltip);
        cell.addEventListener('mouseleave', hideTooltip);
    });

    // Add trigger link event listeners
    const triggerLinks = alertsList.querySelectorAll('.trigger-link');
    triggerLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const alertId = parseInt(link.dataset.alertId);
            const alertName = link.dataset.alertName;
            showLogsView(alertId, alertName);
        });
    });

    // Add select all checkbox event listener
    const selectAllCheckbox = alertsList.querySelector('#selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (event) => {
            const checkboxes = alertsList.querySelectorAll('.alert-checkbox:not(#selectAll)');
            checkboxes.forEach(checkbox => {
                checkbox.checked = event.target.checked;
            });
        });
    }

    // Add individual checkbox event listeners
    const alertCheckboxes = alertsList.querySelectorAll('.alert-checkbox:not(#selectAll)');
    alertCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selectAllCheckbox = alertsList.querySelector('#selectAll');
            if (selectAllCheckbox) {
                const allChecked = Array.from(alertCheckboxes).every(cb => cb.checked);
                selectAllCheckbox.checked = allChecked;
            }
        });
    });
}

// Function to handle alert actions
async function handleAlertAction(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;

    const action = button.dataset.action;
    const alertId = button.dataset.alertId;
    const alert = currentAlerts.find(a => a.id === alertId);

    if (!alert) return;

    try {
        switch (action) {
            case 'edit':
                await handleEditAlert(alert);
                break;
            case 'toggle':
                await handleToggleAlert(alert);
                break;
            case 'delete':
                await handleDeleteAlert(alert);
                break;
        }
    } catch (error) {
        console.error('Error handling alert action:', error);
        showError('Failed to perform action. Please try again.');
    }
}

// Function to display logs
function displayLogs(logs) {
    if (!logs || logs.length === 0) {
        logsList.innerHTML = '<div class="no-logs">No logs found for this alert.</div>';
        return;
    }

    logsList.innerHTML = `
        <table class="logs-table">
            <thead>
                <tr>
                    <th>Message</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(log => {
        // Truncate message for display
        const message = JSON.stringify(log.message) || '';
        const truncatedMessage = message.length > 150 ? message.substring(0, 150) + '...' : message;

        return `
                        <tr>
                            <td class="log-timestamp">${formatDate(new Date(log.timestamp))}</td>
                            <td class="log-message-cell" data-tooltip="${escapeHtml(message)}">
                                <div class="log-message">
                                    ${escapeHtml(truncatedMessage)}
                                </div>
                            </td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;

    // Add tooltip event listeners
    const tooltipCells = logsList.querySelectorAll('.log-message-cell');
    tooltipCells.forEach(cell => {
        cell.addEventListener('mouseenter', showTooltip);
        cell.addEventListener('mouseleave', hideTooltip);
    });
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    if (typeof unsafe !== 'string') {
        try {
            unsafe = String(unsafe);
        } catch (e) {
            console.error('Error converting value to string:', e);
            return '';
        }
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Function to show tooltip
function showTooltip(event) {
    const tooltipContent = event.target.dataset.tooltip;
    if (tooltipContent) {
        globalTooltip.textContent = tooltipContent;
        globalTooltip.style.display = 'block';

        // Position the tooltip
        const rect = event.target.getBoundingClientRect();
        const tooltipHeight = globalTooltip.offsetHeight;
        globalTooltip.style.top = `${rect.top - tooltipHeight - 5}px`;
        globalTooltip.style.left = `${rect.left + (rect.width - globalTooltip.offsetWidth) / 2}px`;
    }
}

// Function to hide tooltip
function hideTooltip() {
    globalTooltip.style.display = 'none';
}


// Function to show error message
function showError(message) {
    alertsList.innerHTML = `<div class="error">${message}</div>`;
}

// 高亮显示更新的警报
function highlightUpdatedAlerts(alertIds, action) {
    const rows = document.querySelectorAll('tr[data-alert-id]');

    rows.forEach(row => {
        const alertId = row.getAttribute('data-alert-id');
        if (alertIds.includes(alertId)) {
            // 添加高亮类
            row.classList.add('highlight-update');

            // 根据操作类型添加不同的样式
            switch (action) {
                case 'stop':
                    row.classList.add('highlight-stop');
                    break;
                case 'restart':
                    row.classList.add('highlight-restart');
                    break;
                case 'delete':
                    row.classList.add('highlight-delete');
                    break;
            }

            // 2秒后移除高亮
            setTimeout(() => {
                row.classList.remove('highlight-update', 'highlight-stop', 'highlight-restart', 'highlight-delete');
            }, 2000);
        }
    });
}

// Function to show logs view
function showLogsView(alertId, alertName) {
    currentAlertId = alertId;
    currentAlertName = alertName;
    currentLogPage = 1;

    // Update UI
    logAlertName.textContent = `Logs for ${alertName}`;
    alertsView.style.display = 'none';
    logsView.style.display = 'block';

    // Hide search controls, title, action buttons, and validation rules dropdown
    const searchBox = document.querySelector('.search-box');
    const title = document.querySelector('.title');
    const buttonGroup = document.querySelector('.button-group');
    const statusSearch = document.getElementById('statusSearch');
    const validationRulesDropdown = document.querySelector('.validation-rules-dropdown');

    if (searchBox) searchBox.style.display = 'none';
    if (title) title.style.display = 'none';
    if (buttonGroup) buttonGroup.style.display = 'none';
    if (statusSearch) statusSearch.style.display = 'none';
    if (validationRulesDropdown) validationRulesDropdown.style.display = 'none';

    // Load logs
    loadLogs();
}

// Function to show alerts view
function showAlertsView() {
    alertsView.style.display = 'block';
    logsView.style.display = 'none';
    currentAlertId = null;
    currentAlertName = null;

    // Show search controls, title, action buttons, and validation rules dropdown
    const searchBox = document.querySelector('.search-box');
    const title = document.querySelector('.title');
    const buttonGroup = document.querySelector('.button-group');
    const statusSearch = document.getElementById('statusSearch');
    const validationRulesDropdown = document.querySelector('.validation-rules-dropdown');

    if (searchBox) searchBox.style.display = 'flex';
    if (title) title.style.display = 'block';
    if (buttonGroup) buttonGroup.style.display = 'flex';
    if (statusSearch) statusSearch.style.display = 'block';
    if (validationRulesDropdown) validationRulesDropdown.style.display = 'block';
}

// Function to load logs
function loadLogs() {
    if (currentAlertId) {
        // Load logs for specific alert
        getLogsForAlert(currentAlertId).then(logs => {
            // Sort logs by timestamp in descending order
            currentLogs = logs.sort((a, b) => b.timestamp - a.timestamp);
            updateLogPagination();
            displayLogs(getCurrentPageLogs());
        }).catch(error => {
            console.error('Error loading logs:', error);
            logsList.innerHTML = '<div class="no-logs">Error loading logs.</div>';
        });
    } else {
        logsList.innerHTML = '<div class="no-logs">No alert selected.</div>';
    }
}

// Function to get current page logs
function getCurrentPageLogs() {
    const startIndex = (currentLogPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    return currentLogs.slice(startIndex, endIndex);
}

// Function to update log pagination
function updateLogPagination() {
    const totalPages = Math.ceil(currentLogs.length / logsPerPage);

    currentLogPageSpan.textContent = currentLogPage;
    totalLogPagesSpan.textContent = totalPages;

    prevLogPageBtn.disabled = currentLogPage === 1;
    nextLogPageBtn.disabled = currentLogPage === totalPages;

    currentLogCountSpan.textContent = Math.min(currentLogPage * logsPerPage, currentLogs.length);
    totalLogCountSpan.textContent = currentLogs.length;
}

// Function to change log page
function changeLogPage(page) {
    if (page < 1 || page > Math.ceil(currentLogs.length / logsPerPage)) return;

    currentLogPage = page;
    updateLogPagination();
    displayLogs(getCurrentPageLogs());
}

// Function to validate selected alerts
function validateSelectedAlerts() {
    // Get selected validation rules
    const selectedRules = Array.from(validationRulesDropdown.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.id);

    if (selectedRules.length === 0) {
        showError('Please select at least one validation rule');
        return;
    }

    // Show validation column
    const validationColumn = document.querySelector('.validation-column');
    if (validationColumn) {
        validationColumn.style.display = 'table-cell';
    }

    // Get checked alerts first
    const checkedRows = document.querySelectorAll('tr[data-alert-id] .alert-checkbox:checked');
    let alertIdsToValidate;

    if (checkedRows.length > 0) {
        // If there are checked alerts, use only those
        alertIdsToValidate = Array.from(checkedRows).map(checkbox =>
            parseInt(checkbox.closest('tr[data-alert-id]').dataset.alertId)
        );
    } else {
        // If no alerts are checked, use all visible rows
        alertIdsToValidate = Array.from(document.querySelectorAll('tr[data-alert-id]'))
            .map(row => parseInt(row.dataset.alertId));
    }

    if (alertIdsToValidate.length === 0) {
        showError('No alerts to validate');
        return;
    }

    // Clear previous validation results
    document.querySelectorAll('tr[data-alert-id]').forEach(row => {
        row.classList.remove('validation-pass', 'validation-fail');
        const validationCell = row.querySelector('.validation-status');
        if (validationCell) {
            validationCell.style.display = 'none';
            validationCell.innerHTML = '';
        }
    });

    // Validate each alert using the original data
    alertIdsToValidate.forEach(alertId => {
        const alert = currentAlerts.find(a => a.id === alertId);
        if (!alert) return;

        const validationResults = selectedRules.map(ruleId => {
            const rule = validationFunctions[ruleId];
            const result = rule.validate(alert);
            return {
                ruleName: rule.name,
                ...result
            };
        });

        const allPassed = validationResults.every(result => result.pass);
        const failedRules = validationResults.filter(result => !result.pass);

        // Find the row in the DOM and update its validation status
        const row = document.querySelector(`tr[data-alert-id="${alertId}"]`);
        if (row) {
            // Update row styling
            row.classList.add(allPassed ? 'validation-pass' : 'validation-fail');

            // Show and update validation cell
            let validationCell = row.querySelector('.validation-status');
            if (validationCell) {
                validationCell.style.display = 'table-cell';
                if (allPassed) {
                    validationCell.innerHTML = '<span class="validation-pass">✓ Pass</span>';
                } else {
                    validationCell.innerHTML = `
                        <span class="validation-fail">✗ Fail</span>
                        <div class="validation-details">
                            ${failedRules.map(rule => `
                                <div class="validation-error">
                                    <strong>${rule.ruleName}:</strong> ${rule.message}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }
        }
    });
}

// Function to show rule creation dialog
function showRuleDialog() {
    ruleDialog.style.display = 'flex';

    // Update dialog title
    const dialogTitle = document.querySelector('.rule-dialog-content h3');
    dialogTitle.textContent = 'Create New Validation Rule';

    ruleTypeSelect.value = 'field_required';
    updateRuleParams();
    document.getElementById('ruleName').value = '';
    ruleDialogError.style.display = 'none';
}

// Function to hide rule creation dialog
function hideRuleDialog() {
    ruleDialog.style.display = 'none';
    document.getElementById('ruleName').value = '';
    ruleTypeSelect.value = 'field_required';
    updateRuleParams();
    ruleDialogError.style.display = 'none';

    // Reset dialog title
    const dialogTitle = document.querySelector('.rule-dialog-content h3');
    dialogTitle.textContent = 'Create New Validation Rule';
}

// Function to save new rule
function saveNewRule() {
    const name = document.getElementById('ruleName').value.trim();
    const type = ruleTypeSelect.value;

    if (!name) {
        showRuleError('Please enter a rule name');
        return;
    }

    const ruleId = name.toLowerCase().replace(/\s+/g, '_');

    // Check if rule already exists
    if (validationFunctions[ruleId]) {
        showRuleError('A rule with this name already exists');
        return;
    }

    try {
        const params = {};
        const typeInputs = ruleParams.querySelectorAll('input, select');
        typeInputs.forEach(input => {
            if (input.id !== 'message') {
                params[input.id] = input.value.trim();
            }
        });

        // Add error message if provided
        const messageInput = document.getElementById('message');
        if (messageInput && messageInput.value.trim()) {
            params.message = messageInput.value.trim();
        }

        // Create rule configuration
        const ruleConfig = {
            type,
            params
        };

        // Create the new rule
        const newRule = createCustomRule(name, ruleConfig);

        // Add the new rule to validation functions
        validationFunctions[ruleId] = newRule;

        // Save to custom rules storage
        customValidationRules[ruleId] = {
            name,
            config: ruleConfig
        };
        saveCustomValidationRules();

        // Add the new rule to the dropdown
        addRuleToDropdown(ruleId, name);

        // Hide dialog and show success message
        hideRuleDialog();
        showSuccess('Rule created successfully');
    } catch (error) {
        showRuleError(error.message);
    }
}

// Function to show rule error
function showRuleError(message) {
    ruleDialogError.textContent = message;
    ruleDialogError.style.display = 'block';
}

// Function to check if a rule is a default rule
function isDefaultRule(ruleId) {
    const defaultRules = ['json_format', 'required_fields', 'price_format', 'timeframe_check'];
    return defaultRules.includes(ruleId);
}

// Function to edit a rule
function editRule(ruleId) {
    if (isDefaultRule(ruleId)) return;

    const rule = validationFunctions[ruleId];
    if (!rule) {
        console.error('Rule not found:', ruleId);
        return;
    }

    // Show the rule dialog
    ruleDialog.style.display = 'flex';

    // Update dialog title
    const dialogTitle = document.querySelector('.rule-dialog-content h3');
    dialogTitle.textContent = 'Edit Validation Rule';

    // Fill in the rule name
    document.getElementById('ruleName').value = rule.name;

    // Set the rule type and update parameters
    if (!rule.config) {
        console.error('Rule config is undefined:', rule);
        return;
    }

    ruleTypeSelect.value = rule.config.type;
    updateRuleParams();

    // Fill in the existing parameters
    const params = rule.config.params;
    console.log('Editing rule:', ruleId, 'with params:', params); // Debug log

    // Handle field relation parameters
    if (rule.config.type === 'field_relation') {
        // Set field names
        document.getElementById('field1').value = params.field1 || '';
        document.getElementById('field2').value = params.field2 || '';

        // Set operators
        document.getElementById('operator1').value = params.operator1 || '==';
        document.getElementById('operator2').value = params.operator2 || '==';

        // Set values based on operator type
        const isListOperator1 = params.operator1 === 'in' || params.operator1 === 'not_in';
        const isListOperator2 = params.operator2 === 'in' || params.operator2 === 'not_in';

        if (isListOperator1) {
            document.getElementById('value1List').value = params.value1 || '';
            document.getElementById('value1InputGroup').style.display = 'none';
            document.getElementById('value1ListGroup').style.display = 'block';
        } else {
            document.getElementById('value1').value = params.value1 || '';
            document.getElementById('value1InputGroup').style.display = 'block';
            document.getElementById('value1ListGroup').style.display = 'none';
        }

        if (isListOperator2) {
            document.getElementById('value2List').value = params.value2 || '';
            document.getElementById('value2InputGroup').style.display = 'none';
            document.getElementById('value2ListGroup').style.display = 'block';
        } else {
            document.getElementById('value2').value = params.value2 || '';
            document.getElementById('value2InputGroup').style.display = 'block';
            document.getElementById('value2ListGroup').style.display = 'none';
        }

        // Set 'then' condition
        document.getElementById('then').value = params.then || 'must';
    } else {
        // Handle other rule types
        Object.keys(params).forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                if (input.type === 'select-one') {
                    // For select elements, find the matching option
                    const option = Array.from(input.options).find(opt => opt.value === params[key]);
                    if (option) {
                        input.value = params[key];
                    }
                } else {
                    input.value = params[key];
                }
            }
        });
    }

    // Add error message if provided
    const messageInput = document.getElementById('message');
    if (messageInput && params.message) {
        messageInput.value = params.message;
    }

    // Change the save button to update mode
    const saveBtn = document.getElementById('saveRule');
    saveBtn.textContent = 'Update';
    saveBtn.onclick = () => saveEditedRule(ruleId);
}

// Function to save edited rule
function saveEditedRule(ruleId) {
    const name = document.getElementById('ruleName').value.trim();
    const type = ruleTypeSelect.value;

    if (!name) {
        showRuleError('Please enter a rule name');
        return;
    }

    try {
        const params = {};
        const typeInputs = ruleParams.querySelectorAll('input, select');
        typeInputs.forEach(input => {
            if (input.id !== 'message') {
                params[input.id] = input.value.trim();
            }
        });

        // Add error message if provided
        const messageInput = document.getElementById('message');
        if (messageInput && messageInput.value.trim()) {
            params.message = messageInput.value.trim();
        }

        // Create rule configuration
        const ruleConfig = {
            type,
            params
        };

        // Update the rule
        validationFunctions[ruleId] = createCustomRule(name, ruleConfig);

        // Update custom rules storage
        customValidationRules[ruleId] = {
            name,
            config: ruleConfig
        };
        saveCustomValidationRules();

        // Update the dropdown
        const ruleOption = document.querySelector(`.rule-option input[id="${ruleId}"]`).closest('.rule-option');
        const label = ruleOption.querySelector('label');
        label.textContent = name;

        // Hide dialog and show success message
        hideRuleDialog();
        showSuccess('Rule updated successfully');
    } catch (error) {
        showRuleError(error.message);
    }
}

// Function to delete a rule
function deleteRule(ruleId) {
    if (isDefaultRule(ruleId)) return;

    if (confirm('Are you sure you want to delete this rule?')) {
        // Remove from validation functions
        delete validationFunctions[ruleId];

        // Remove from custom rules storage
        delete customValidationRules[ruleId];
        saveCustomValidationRules();

        // Remove from dropdown
        const ruleOption = document.querySelector(`.rule-option input[id="${ruleId}"]`).closest('.rule-option');
        ruleOption.remove();

        showSuccess('Rule deleted successfully');
    }
}

// Modify addRuleToDropdown to include edit and delete buttons for custom rules
function addRuleToDropdown(ruleId, ruleName) {
    const dropdownContent = document.querySelector('.validation-rules-dropdown .dropdown-content');
    const newRuleOption = document.createElement('div');
    newRuleOption.className = 'rule-option';

    const isDefault = isDefaultRule(ruleId);
    const actionsHtml = isDefault ? '' : `
        <div class="rule-actions">
            <button class="edit-rule-btn" data-rule-id="${ruleId}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-rule-btn" data-rule-id="${ruleId}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    newRuleOption.innerHTML = `
        <input type="checkbox" id="${ruleId}">
        <label for="${ruleId}">${ruleName}</label>
        ${actionsHtml}
    `;

    // Insert before the "New Rule" button
    const newRuleBtn = dropdownContent.querySelector('.new-rule-option');
    dropdownContent.insertBefore(newRuleOption, newRuleBtn);

    // Add event listeners for edit and delete buttons
    if (!isDefault) {
        const editBtn = newRuleOption.querySelector('.edit-rule-btn');
        const deleteBtn = newRuleOption.querySelector('.delete-rule-btn');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editRule(ruleId);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteRule(ruleId);
        });
    }
}

// Function to show success message
function showSuccess(message) {
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.textContent = message;
    document.body.appendChild(successMessage);

    setTimeout(() => {
        successMessage.remove();
    }, 3000);
}

// Function to save custom validation rules to storage
function saveCustomValidationRules() {
    chrome.storage.local.set({ customValidationRules }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error saving custom validation rules:', chrome.runtime.lastError);
            showError('Failed to save custom validation rules');
        }
    });
}

// Function to load custom validation rules from storage
function loadCustomValidationRules() {
    chrome.storage.local.get(['customValidationRules'], (result) => {
        if (chrome.runtime.lastError) {
            console.error('Error loading custom validation rules:', chrome.runtime.lastError);
            return;
        }

        if (result.customValidationRules) {
            customValidationRules = result.customValidationRules;
            // Add custom rules to validation functions
            Object.entries(customValidationRules).forEach(([ruleId, rule]) => {
                validationFunctions[ruleId] = createCustomRule(rule.name, rule.config);
                // Add rule to dropdown
                addRuleToDropdown(ruleId, rule.name);
            });
        }
    });
}