class TemplateService {
    constructor() {
        this.defaultTemplate = {
            name: '',
            description: '',
            priority: 'normal',
            status: 'to do',
            tags: [],
            assignees: [],
            customFields: []
        };
    }

    applyTemplate(processedTicket, options = {}) {
        const template = { ...this.defaultTemplate };
        
        // Apply processed ticket data
        template.name = processedTicket.title || 'Untitled Ticket';
        template.description = this.formatDescription(processedTicket);
        template.priority = processedTicket.priority || options.priority || 'normal';
        template.tags = this.formatTags(processedTicket.tags, processedTicket.type);
        
        // Apply options
        if (options.assignee) {
            template.assignees = [options.assignee];
        }
        
        if (options.listId) {
            template.listId = options.listId;
        }

        return template;
    }

    formatDescription(processedTicket) {
        let description = processedTicket.description || '';
        
        // Add type information
        if (processedTicket.type) {
            description = `**Type:** ${processedTicket.type.charAt(0).toUpperCase() + processedTicket.type.slice(1)}\n\n${description}`;
        }
        
        // Add acceptance criteria if available
        if (processedTicket.acceptanceCriteria && processedTicket.acceptanceCriteria.length > 0) {
            description += '\n\n**Acceptance Criteria:**\n';
            processedTicket.acceptanceCriteria.forEach((criteria, index) => {
                description += `${index + 1}. ${criteria}\n`;
            });
        }
        
        // Add estimated hours if available
        if (processedTicket.estimatedHours) {
            description += `\n\n**Estimated Hours:** ${processedTicket.estimatedHours}`;
        }
        
        return description;
    }

    formatTags(tags = [], type = null) {
        const formattedTags = [...(tags || [])];
        
        // Add type as tag if not already present
        if (type && !formattedTags.includes(type)) {
            formattedTags.push(type);
        }
        
        // Add auto-generated tag
        formattedTags.push('auto-generated');
        
        return formattedTags;
    }

    // Template for different ticket types
    getTemplateByType(type) {
        const templates = {
            bug: {
                name: '[BUG] {title}',
                description: `**Bug Report**

**Description:**
{description}

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Environment:**
- Browser/OS: 
- Version: 

**Additional Information:**
{additionalInfo}`,
                priority: 'high',
                tags: ['bug', 'needs-investigation']
            },
            
            feature: {
                name: '[FEATURE] {title}',
                description: `**Feature Request**

**Description:**
{description}

**User Story:**
As a [user type], I want [functionality] so that [benefit].

**Acceptance Criteria:**
{acceptanceCriteria}

**Additional Notes:**
{additionalInfo}`,
                priority: 'normal',
                tags: ['feature', 'enhancement']
            },
            
            task: {
                name: '[TASK] {title}',
                description: `**Task Description:**
{description}

**Requirements:**
{requirements}

**Definition of Done:**
{definitionOfDone}`,
                priority: 'normal',
                tags: ['task']
            },
            
            improvement: {
                name: '[IMPROVEMENT] {title}',
                description: `**Improvement Description:**
{description}

**Current State:**
{currentState}

**Desired State:**
{desiredState}

**Benefits:**
{benefits}`,
                priority: 'normal',
                tags: ['improvement', 'optimization']
            }
        };
        
        return templates[type] || templates.task;
    }

    applyTypeTemplate(processedTicket, type) {
        const template = this.getTemplateByType(type || processedTicket.type);
        
        let name = template.name.replace('{title}', processedTicket.title || 'Untitled');
        let description = template.description
            .replace('{description}', processedTicket.description || '')
            .replace('{acceptanceCriteria}', this.formatAcceptanceCriteria(processedTicket.acceptanceCriteria))
            .replace('{additionalInfo}', '')
            .replace('{requirements}', '')
            .replace('{definitionOfDone}', '')
            .replace('{currentState}', '')
            .replace('{desiredState}', '')
            .replace('{benefits}', '');
        
        return {
            name,
            description,
            priority: processedTicket.priority || template.priority,
            tags: [...template.tags, ...(processedTicket.tags || [])],
            status: 'to do',
            assignees: [],
            customFields: []
        };
    }

    formatAcceptanceCriteria(criteria) {
        if (!criteria || criteria.length === 0) {
            return '- [ ] To be defined';
        }
        
        return criteria.map(item => `- [ ] ${item}`).join('\n');
    }
}

module.exports = new TemplateService();