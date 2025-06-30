const axios = require('axios');

class ClickUpService {
    constructor() {
        this.apiToken = process.env.CLICKUP_API_TOKEN;
        this.baseURL = 'https://api.clickup.com/api/v2';
        this.teamId = process.env.CLICKUP_TEAM_ID;
        this.spaceId = process.env.CLICKUP_SPACE_ID;
        this.folderId = process.env.CLICKUP_FOLDER_ID;
        this.listId = process.env.CLICKUP_LIST_ID;
        
        if (!this.apiToken) {
            throw new Error('CLICKUP_API_TOKEN is required');
        }
        
        if (!this.listId) {
            console.warn('CLICKUP_LIST_ID not set. You will need to provide listId when creating tasks.');
        }
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': this.apiToken,
                'Content-Type': 'application/json'
            }
        });
    }

    // Verify list access and get list details
    async verifyListAccess(listId) {
        try {
            console.log(`Verifying access to list: ${listId}`);
            const response = await this.client.get(`/list/${listId}`);
            console.log(`List verified: ${response.data.name} (ID: ${response.data.id})`);
            return response.data;
        } catch (error) {
            console.error(`List verification failed:`, error.response?.data);
            throw new Error(`Cannot access list ${listId}: ${error.response?.data?.err || error.message}`);
        }
    }

    async createTask(taskData) {
        try {
            const listId = taskData.listId || this.listId;
            
            if (!listId) {
                throw new Error('List ID is required to create a task. Set CLICKUP_LIST_ID in your .env file or provide listId in taskData.');
            }

            console.log(`Creating task in list: ${listId}`);

            // First, let's verify the list exists and we have access
            await this.verifyListAccess(listId);

            const payload = {
                name: taskData.name,
                description: taskData.description,
                priority: this.mapPriority(taskData.priority),
                status: 'open',
                assignees: taskData.assignees || [],
                tags: taskData.tags || [],
                due_date: taskData.dueDate ? new Date(taskData.dueDate).getTime() : null,
                custom_fields: taskData.customFields || []
            };

            // Remove null values
            Object.keys(payload).forEach(key => {
                if (payload[key] === null || payload[key] === undefined) {
                    delete payload[key];
                }
            });

            console.log('Creating ClickUp task with payload:', JSON.stringify(payload, null, 2));

            const response = await this.client.post(`/list/${listId}/task`, payload);

            // Return the task with URL if available
            const task = response.data;
            if (task && task.id) {
                task.url = `https://app.clickup.com/t/${task.id}`;
            }

            return task;
        } catch (error) {
            console.error('ClickUp API Error:', error.response?.data);
            throw new Error(`Failed to create task: ${error.response?.data?.err || error.message}`);
        }
    }

    mapPriority(priority) {
        const priorityMap = {
            'urgent': 1,
            'high': 2,
            'normal': 3,
            'low': 4
        };
        return priorityMap[priority?.toLowerCase()] || 3;
    }


    // Search tasks using ClickUp's search API
    async searchTasks(query, options = {}) {
        try {
            const {
                teamId = this.teamId,
                assignees = [],
                statuses = [],
                dateCreatedGt = null,
                dateCreatedLt = null,
                dateUpdatedGt = null,
                dateUpdatedLt = null,
                dueDateGt = null,
                dueDateLt = null,
                tags = [],
                includeSubtasks = false,
                page = 0,
                orderBy = 'updated',
                reverse = true
            } = options;

            if (!teamId) {
                throw new Error('Team ID is required for searching tasks');
            }

            const params = new URLSearchParams();
            
            // Add search query
            if (query) {
                params.append('query', query);
            }

            // Add filters
            if (assignees.length > 0) {
                assignees.forEach(assignee => params.append('assignees[]', assignee));
            }
            
            if (statuses.length > 0) {
                statuses.forEach(status => params.append('statuses[]', status));
            }
            
            if (tags.length > 0) {
                tags.forEach(tag => params.append('tags[]', tag));
            }

            // Date filters
            if (dateCreatedGt) params.append('date_created_gt', dateCreatedGt);
            if (dateCreatedLt) params.append('date_created_lt', dateCreatedLt);
            if (dateUpdatedGt) params.append('date_updated_gt', dateUpdatedGt);
            if (dateUpdatedLt) params.append('date_updated_lt', dateUpdatedLt);
            if (dueDateGt) params.append('due_date_gt', dueDateGt);
            if (dueDateLt) params.append('due_date_lt', dueDateLt);

            // Other options
            params.append('include_subtasks', includeSubtasks);
            params.append('page', page);
            params.append('order_by', orderBy);
            params.append('reverse', reverse);

            console.log(`Searching tasks in team ${teamId} with query: "${query}"`);
            
            const response = await this.client.get(`/team/${teamId}/task?${params.toString()}`);
            
            return {
                tasks: response.data.tasks || [],
                lastPage: response.data.last_page || false
            };
        } catch (error) {
            console.error('Search tasks error:', error.response?.data);
            throw new Error(`Failed to search tasks: ${error.response?.data?.err || error.message}`);
        }
    }

}

module.exports = new ClickUpService();