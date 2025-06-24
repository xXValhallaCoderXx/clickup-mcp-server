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
        
        // Context management
        document.getElementById('manage-context').addEventListener('click', () => this.showContextModal());
        document.getElementById('close-context').addEventListener('click', () => this.hideContextModal());
        document.getElementById('save-context').addEventListener('click', () => this.saveContext());
        document.getElementById('reset-context').addEventListener('click', () => this.resetContext());

        // Help modal
        document.getElementById('show-help').addEventListener('click', () => this.showHelp());
        document.getElementById('close-help').addEventListener('click', () => this.hideHelp());
        
        // Close modal when clicking outside
        document.getElementById('help-modal').addEventListener('click', (e) => {
            if (e.target.id === 'help-modal') {
                this.hideHelp();
            }
        });
        
        document.getElementById('context-modal').addEventListener('click', (e) => {
            if (e.target.id === 'context-modal') {
                this.hideContextModal();
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
                this.showNotification('ClickUp connection successful!', 'success');
            } else {
                this.updateStatus('error', 'ClickUp Error');
                this.showNotification('ClickUp connection failed: ' + result.error, 'error');
            }
        } catch (error) {
            this.updateStatus('error', 'Connection Failed');
            this.showNotification('Connection test failed', 'error');
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
                <h3><i class="fas fa-check-circle"></i> Engineering Ticket Created!</h3>
                <p>Your structured ticket has been created in ClickUp with proper formatting.</p>
                ${ticket.url ? `<a href="${ticket.url}" target="_blank" class="ticket-link">
                    <i class="fas fa-external-link-alt"></i> View in ClickUp
                </a>` : ''}
            </div>
            
            <div class="ticket-preview">
                <h4>${processed.title || 'Untitled Ticket'}</h4>
                
                <div class="ticket-meta">
                    <span class="meta-item type-${processed.type || 'task'}">
                        <i class="fas fa-${this.getTypeIcon(processed.type)}"></i> ${(processed.type || 'task').toUpperCase()}
                    </span>
                    <span class="meta-item priority-${processed.priority || 'normal'}">
                        <i class="fas fa-flag"></i> ${(processed.priority || 'normal').toUpperCase()}
                    </span>
                    ${processed.estimatedComplexity ? `<span class="meta-item">
                        <i class="fas fa-layer-group"></i> ${processed.estimatedComplexity} complexity
                    </span>` : ''}
                    ${processed.estimatedHours ? `<span class="meta-item">
                        <i class="fas fa-clock"></i> ${processed.estimatedHours}h
                    </span>` : ''}
                </div>

                ${processed.summary ? `
                    <div class="ticket-section">
                        <h5>Summary</h5>
                        <p>${processed.summary}</p>
                    </div>
                ` : ''}

                ${processed.acceptanceCriteria && processed.acceptanceCriteria.length > 0 ? `
                    <div class="ticket-section">
                        <h5>Acceptance Criteria</h5>
                        <ul class="criteria-list">
                            ${processed.acceptanceCriteria.map(criteria => `<li><i class="far fa-square"></i> ${criteria}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${processed.technicalNotes ? `
                    <div class="ticket-section">
                        <h5>Technical Notes</h5>
                        <p>${processed.technicalNotes}</p>
                    </div>
                ` : ''}

                ${processed.dependencies && processed.dependencies.length > 0 ? `
                    <div class="ticket-section">
                        <h5>Dependencies</h5>
                        <ul class="simple-list">
                            ${processed.dependencies.map(dep => `<li>${dep}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${processed.affectedComponents && processed.affectedComponents.length > 0 ? `
                    <div class="ticket-section">
                        <h5>Affected Components</h5>
                        <ul class="simple-list">
                            ${processed.affectedComponents.map(comp => `<li>${comp}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div class="ticket-tags">
                    ${(processed.tags || []).map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            </div>
        `;
        
        this.showResults(html);
        this.showNotification('Engineering ticket created successfully!', 'success');
    }

    getTypeIcon(type) {
        const icons = {
            'bug': 'bug',
            'feature': 'plus-circle',
            'task': 'tasks',
            'improvement': 'arrow-up',
            'spike': 'search'
        };
        return icons[type] || 'tasks';
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
        this.showNotification('Failed to create ticket', 'error');
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

    async showContextModal() {
        document.getElementById('context-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        await this.loadContext();
    }

    hideContextModal() {
        document.getElementById('context-modal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async loadContext() {
        try {
            const response = await fetch('/api/context');
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('context-textarea').value = result.context;
                this.updateContextStats(result.stats);
            } else {
                this.showNotification('Failed to load context', 'error');
            }
        } catch (error) {
            console.error('Error loading context:', error);
            this.showNotification('Error loading context', 'error');
        }
    }

    async saveContext() {
        const contextContent = document.getElementById('context-textarea').value;
        const saveBtn = document.getElementById('save-context');
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        try {
            const response = await fetch('/api/context', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ context: contextContent })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Context saved successfully!', 'success');
                await this.loadContext(); // Refresh stats
            } else {
                this.showNotification('Failed to save context: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error saving context:', error);
            this.showNotification('Error saving context', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Context';
        }
    }

    async resetContext() {
        if (!confirm('Are you sure you want to reset to the default context? This will overwrite your current context.')) {
            return;
        }
        
        try {
            // Load the default context template
            const defaultContext = `# Company & Project Context

## Company Information
**Company Name:** Your Company Name
**Industry:** Technology/SaaS/E-commerce/etc.
**Team Size:** 10-50 developers
**Development Methodology:** Agile/Scrum/Kanban

## Tech Stack
### Frontend
- React/Vue/Angular
- TypeScript
- CSS Framework (Tailwind/Bootstrap)

### Backend
- Node.js/Python/Java
- Database (PostgreSQL/MongoDB)
- API (REST/GraphQL)

## Current Projects
### Main Product
- **Name:** Your main application
- **Description:** Brief description
- **Key Features:** List main features
- **Current Phase:** Development status

## Development Standards
- Code review required
- Automated testing
- CI/CD pipeline
- Documentation standards

*Edit this template with your actual company information.*`;

            document.getElementById('context-textarea').value = defaultContext;
            this.showNotification('Context reset to default template', 'success');
        } catch (error) {
            this.showNotification('Error resetting context', 'error');
        }
    }

    updateContextStats(stats) {
        document.getElementById('stat-sections').textContent = stats.totalSections || 0;
        document.getElementById('stat-characters').textContent = (stats.totalCharacters || 0).toLocaleString();
        
        if (stats.lastModified) {
            const date = new Date(stats.lastModified);
            document.getElementById('stat-updated').textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } else {
            document.getElementById('stat-updated').textContent = 'Never';
        }
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
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
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
        const helpModal = document.getElementById('help-modal');
        const contextModal = document.getElementById('context-modal');
        
        if (helpModal && helpModal.style.display === 'block') {
            document.getElementById('close-help').click();
        } else if (contextModal && contextModal.style.display === 'block') {
            document.getElementById('close-context').click();
        }
    }
    
    // Ctrl/Cmd + S to save context when modal is open
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const contextModal = document.getElementById('context-modal');
        if (contextModal && contextModal.style.display === 'block') {
            e.preventDefault();
            document.getElementById('save-context').click();
        }
    }
});