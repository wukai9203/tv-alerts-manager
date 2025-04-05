import { errorMonitoring } from './error-monitoring';

class FeedbackManager {
    constructor() {
        this.feedbackForm = null;
        this.feedbackModal = null;
    }

    init() {
        this.createFeedbackUI();
        this.setupEventListeners();
    }

    createFeedbackUI() {
        // Create feedback button
        const feedbackButton = document.createElement('button');
        feedbackButton.id = 'feedback-button';
        feedbackButton.className = 'feedback-button';
        feedbackButton.innerHTML = '💬 Feedback';
        document.body.appendChild(feedbackButton);

        // Create feedback modal
        this.feedbackModal = document.createElement('div');
        this.feedbackModal.id = 'feedback-modal';
        this.feedbackModal.className = 'feedback-modal';
        this.feedbackModal.innerHTML = `
      <div class="feedback-modal-content">
        <h2>Send Feedback</h2>
        <form id="feedback-form">
          <div class="form-group">
            <label for="feedback-type">Type</label>
            <select id="feedback-type" required>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="improvement">Improvement</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="feedback-title">Title</label>
            <input type="text" id="feedback-title" required>
          </div>
          <div class="form-group">
            <label for="feedback-description">Description</label>
            <textarea id="feedback-description" required></textarea>
          </div>
          <div class="form-group">
            <label for="feedback-screenshot">Screenshot (optional)</label>
            <input type="file" id="feedback-screenshot" accept="image/*">
          </div>
          <div class="form-actions">
            <button type="submit">Submit</button>
            <button type="button" class="cancel">Cancel</button>
          </div>
        </form>
      </div>
    `;
        document.body.appendChild(this.feedbackModal);

        // Get form reference
        this.feedbackForm = document.getElementById('feedback-form');
    }

    setupEventListeners() {
        // Show modal
        document.getElementById('feedback-button').addEventListener('click', () => {
            this.showModal();
        });

        // Hide modal
        this.feedbackModal.querySelector('.cancel').addEventListener('click', () => {
            this.hideModal();
        });

        // Handle form submission
        this.feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });

        // Close modal on outside click
        this.feedbackModal.addEventListener('click', (e) => {
            if (e.target === this.feedbackModal) {
                this.hideModal();
            }
        });
    }

    showModal() {
        this.feedbackModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        this.feedbackModal.style.display = 'none';
        document.body.style.overflow = '';
        this.feedbackForm.reset();
    }

    async handleSubmit() {
        try {
            const formData = new FormData(this.feedbackForm);
            const feedback = {
                type: formData.get('feedback-type'),
                title: formData.get('feedback-title'),
                description: formData.get('feedback-description'),
                screenshot: formData.get('feedback-screenshot'),
                timestamp: new Date().toISOString(),
                version: chrome.runtime.getManifest().version,
            };

            // Send feedback to server
            await this.sendFeedback(feedback);

            // Show success message
            this.showMessage('Thank you for your feedback!', 'success');
            this.hideModal();
        } catch (error) {
            errorMonitoring.captureError(error, { operation: 'submitFeedback' });
            this.showMessage('Failed to submit feedback. Please try again.', 'error');
        }
    }

    async sendFeedback(feedback) {
        // TODO: Implement actual feedback submission
        // For now, just log to console and error monitoring
        console.log('Feedback submitted:', feedback);
        errorMonitoring.captureMessage('Feedback submitted', 'info', feedback);
    }

    showMessage(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `feedback-message ${type}`;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
}

export const feedbackManager = new FeedbackManager(); 