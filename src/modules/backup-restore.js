import JSZip from 'jszip';
import { errorMonitoring } from './error-monitoring';

class BackupRestore {
    constructor() {
        this.zip = new JSZip();
    }

    async createBackup() {
        try {
            // Get all data from storage
            const data = await this.getAllStorageData();

            // Create backup file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backup = {
                version: '1.0',
                timestamp,
                data
            };

            // Convert to JSON and compress
            const jsonString = JSON.stringify(backup, null, 2);
            this.zip.file('backup.json', jsonString);

            // Generate zip file
            const content = await this.zip.generateAsync({ type: 'blob' });

            // Create download link
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tv-alerts-backup-${timestamp}.zip`;
            link.click();

            // Cleanup
            URL.revokeObjectURL(url);

            errorMonitoring.captureMessage('Backup created successfully', 'info');
            return true;
        } catch (error) {
            errorMonitoring.captureError(error, { operation: 'createBackup' });
            throw error;
        }
    }

    async restoreBackup(file) {
        try {
            // Read zip file
            const zip = await JSZip.loadAsync(file);

            // Get backup file
            const backupFile = zip.file('backup.json');
            if (!backupFile) {
                throw new Error('Invalid backup file: missing backup.json');
            }

            // Parse backup data
            const backupContent = await backupFile.async('string');
            const backup = JSON.parse(backupContent);

            // Validate backup version
            if (backup.version !== '1.0') {
                throw new Error(`Unsupported backup version: ${backup.version}`);
            }

            // Restore data to storage
            await this.restoreStorageData(backup.data);

            errorMonitoring.captureMessage('Backup restored successfully', 'info');
            return true;
        } catch (error) {
            errorMonitoring.captureError(error, { operation: 'restoreBackup' });
            throw error;
        }
    }

    async getAllStorageData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, (result) => {
                resolve(result);
            });
        });
    }

    async restoreStorageData(data) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
}

export const backupRestore = new BackupRestore(); 