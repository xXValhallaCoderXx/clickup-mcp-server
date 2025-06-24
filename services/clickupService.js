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

    async getTeams() {
        try {
            const response = await this.client.get('/team');
            return response.data.teams;
        } catch (error) {
            throw new Error(`Failed to get teams: ${error.response?.data?.err || error.message}`);
        }
    }

    async getSpaces(teamId = this.teamId) {
        try {
            const response = await this.client.get(`/team/${teamId}/space`);
            return response.data.spaces;
        } catch (error) {
            throw new Error(`Failed to get spaces: ${error.response?.data?.err || error.message}`);
        }
    }

    async getFolders(spaceId = this.spaceId) {
        try {
            const response = await this.client.get(`/space/${spaceId}/folder`);
            return response.data.folders;
        } catch (error) {
            throw new Error(`Failed to get folders: ${error.response?.data?.err || error.message}`);
        }
    }

    async getLists(folderId = this.folderId) {
        try {
            const response = await this.client.get(`/folder/${folderId}/list`);
            return response.data.lists;
        } catch (error) {
            throw new Error(`Failed to get lists: ${error.response?.data?.err || error.message}`);
        }
    }

    async createTask(taskData) {
        try {
            const listId = taskData.listId || this.listId;
            
            if (!listId) {
                throw new Error('List ID is required to create a task. Set CLICKUP_LIST_ID in your .env file or provide listId in taskData.');
            }

            const payload = {
                name: taskData.name,
                description: taskData.description,
                priority: this.mapPriority(taskData.priority),
                status: taskData.status || 'to do',
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
            return response.data;
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

    async getTaskStatuses(listId = this.listId) {
        try {
            const response = await this.client.get(`/list/${listId}`);
            return response.data.statuses;
        } catch (error) {
            throw new Error(`Failed to get task statuses: ${error.response?.data?.err || error.message}`);
        }
    }

    async getTeamMembers(teamId = this.teamId) {
        try {
            const response = await this.client.get(`/team/${teamId}`);
            return response.data.team.members;
        } catch (error) {
            throw new Error(`Failed to get team members: ${error.response?.data?.err || error.message}`);
        }
    }
}

module.exports = new ClickUpService();