class TicketCreator {
    constructor() {
        this.form = document.getElementById('ticket-form');
        this.descriptionTextarea = document.getElementById('description');
        this.charCounter = document.getElementById('char-count');
        this.createBtn = document.getElementById('create-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.previewSection = document.getElementById('preview-section');
        this.resultSection = document.getElementById('result-section');
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        
        this.initializeEventListeners();
        this.checkServerStatus();
    }

    initializeEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Character counter
        this.descriptionTextarea.addEventListener('input', () => this.updateCharCounter());
        
        // Clear button
        this.clearBtn.addEventListener('click', () => this.clearForm());
        
        // Test connection button
        document.getElementById('test-connection').addEventListener('click', () => this.testConnection());
        
        // Help modal
        document.getElementById('show-help').addEventListener('click', () => this.showHelp());
        document.getElementById('close-help').addEventListener('click', () => this.hideHelp());
        
        // Close modal when clicking outside
        document.getElementById('help-modal').addEventListener('click', (e) => {
            if (e.target.id === 'help-modal') {
                this.hideHelp();
            }
        });
        
        // Auto-resize textarea
        this.descriptionTextarea.addEventListener('input', () => this.autoResizeTextarea());
        
        // Initial character count
        this.updateCharCounter();
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const data = {
            description: formData.get('description').trim(),
            priority: formData.get('priority'),
            assignee: formData.get('assignee').trim() || null
        };

        if (!data.description) {
            this.showError('Please provide a description for the ticket.');
            return;
        }

        this.setLoading(true);
        this.hideResults();

        try {
            const response = await fetch('/api/create-ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess(result);
            } else {
                this.showError(result.error || 'Failed to create ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            this.showError('Network error. Please check your connection and try again.');
        } finally {
            this.setLoading(false);
        }
    }

    async checkServerStatus() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                this.updateStatus('connected', 'Connected');
            } else {
                this.updateStatus('error', 'Server Error');
            }
        } catch (error) {
            this.updateStatus('error', 'Disconnected');
        }
    }

    async testConnection() {
        this.updateStatus('checking', 'Testing...');
        
        try {
            const response = await fetch('/api/test-clickup');
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.updateStatus('connected', 'ClickUp Connected');
                this.showNotification('✅ ClickUp connection successful!', 'success');
            } else {
                this.updateStatus('error', 'ClickUp Error');
                this.showNotification('❌ ClickUp connection failed: ' + result.error, 'error');
            }
        } catch (error) {
            this.updateStatus('error', 'Connection Failed');
            this.showNotification('❌ Connection test failed', 'error');
        }
    }

    updateStatus(status, text) {
        this.statusDot.className = `status-dot ${status}`;
        this.statusText.textContent = text;
    }

    setLoading(loading) {
        this.createBtn.disabled = loading;
        this.createBtn.classList.toggle('loading', loading);
        
        if (loading) {
            this.createBtn.querySelector('span').textContent = 'Creating...';
        } else {
            this.createBtn.querySelector('span').textContent = 'Create Ticket';
        }
    }

    showSuccess(result) {
        const ticket = result.ticket;
        const processed = result.processed;
        
        const html = `
            <div class="success-message">
                <h3><i class="fas fa-check-circle"></i> Ticket Created Successfully!</h3>
                <p>Your ticket has been created in ClickUp.</p>
                ${ticket.url ? `<a href="${ticket.url}" target="_blank" class="ticket-link">
                    <i class="fas fa-external-link-alt"></i> View Ticket
                </a>` : ''}
            </div>
            
            <div class="ticket-preview">
                <h4>${processed.title || 'Untitled Ticket'}</h4>
                <div class="ticket-meta">
                    <span class="meta-item">
                        <i class="fas fa-tag"></i> ${processed.type || 'task'}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-exclamation-triangle"></i> ${processed.priority || 'normal'}
                    </span>
                    ${processed.estimatedHours ? `<span class="meta-item">
                        <i class="fas fa-clock"></i> ${processed.estimatedHours}h
                    </span>` : ''}
                </div>
                <div class="ticket-description">${processed.description || ''}</div>
                ${processed.acceptanceCriteria && processed.acceptanceCriteria.length > 0 ? `
                    <div style="margin-top: 15px;">
                        <strong>Acceptance Criteria:</strong>
                        <ul style="margin-left: 20px; margin-top: 5px;">
                            ${processed.acceptanceCriteria.map(criteria => `<li>${criteria}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.showResults(html);
        this.showNotification('🎉 Ticket created successfully!', 'success');
    }

    showError(message) {
        const html = `
            <div class="error-message">
                <h3><i class="fas fa-exclamation-circle"></i> Error Creating Ticket</h3>
                <p>${message}</p>
                <p style="margin-top: 10px; font-size: 0.9rem; opacity: 0.9;">
                    Please check your configuration and try again.
                </p>
            </div>
        `;
        
        this.showResults(html);
        this.showNotification('❌ Failed to create ticket', 'error');
    }

    showResults(html) {
        this.resultSection.querySelector('#result-content').innerHTML = html;
        this.resultSection.style.display = 'block';
        this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideResults() {
        this.resultSection.style.display = 'none';
        this.previewSection.style.display = 'none';
    }

    clearForm() {
        this.form.reset();
        this.updateCharCounter();
        this.hideResults();
        this.descriptionTextarea.focus();
        this.autoResizeTextarea();
    }

    updateCharCounter() {
        const count = this.descriptionTextarea.value.length;
        this.charCounter.textContent = count.toLocaleString();
        
        // Color coding for character count
        if (count < 50) {
            this.charCounter.style.color = '#ef4444';
        } else if (count < 200) {
            this.charCounter.style.color = '#f59e0b';
        } else {
            this.charCounter.style.color = '#22c55e';
        }
    }

    autoResizeTextarea() {
        const textarea = this.descriptionTextarea;
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px';
    }

    showHelp() {
        document.getElementById('help-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideHelp() {
        document.getElementById('help-modal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 15px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.8;
                    transition: opacity 0.3s ease;
                }
                .notification-close:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        const autoRemove = setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeNotification(notification);
        });
    }

    removeNotification(notification) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TicketCreator();
});

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = document.getElementById('ticket-form');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('help-modal');
        if (modal && modal.style.display === 'block') {
            document.getElementById('close-help').click();
        }
    }
});