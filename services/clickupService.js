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

    // Helper method to extract List ID from ClickUp URL
    static extractListIdFromUrl(url) {
        try {
            // Match patterns like: /v/l/rf3me-17585 or /v/l/123456
            const match = url.match(/\/v\/l\/([^/?]+)/);
            return match ? match[1] : null;
        } catch (error) {
            return null;
        }
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

    // Method to find all accessible lists
    async findAllLists() {
        try {
            const teams = await this.getTeams();
            const allLists = [];

            for (const team of teams) {
                try {
                    const spaces = await this.getSpaces(team.id);

                    for (const space of spaces) {
                        try {
                            // Try to get lists directly from space (folderless lists)
                            const spaceResponse = await this.client.get(`/space/${space.id}/list`);
                            if (spaceResponse.data.lists) {
                                allLists.push(...spaceResponse.data.lists.map(list => ({
                                    ...list,
                                    teamName: team.name,
                                    spaceName: space.name,
                                    location: 'space'
                                })));
                            }
                        } catch (error) {
                            // Space might not have direct lists
                        }

                        try {
                            // Get folders in space
                            const folders = await this.getFolders(space.id);

                            for (const folder of folders) {
                                try {
                                    const lists = await this.getLists(folder.id);
                                    allLists.push(...lists.map(list => ({
                                        ...list,
                                        teamName: team.name,
                                        spaceName: space.name,
                                        folderName: folder.name,
                                        location: 'folder'
                                    })));
                                } catch (error) {
                                    // Folder might not have lists
                                }
                            }
                        } catch (error) {
                            // Space might not have folders
                        }
                    }
                } catch (error) {
                    console.warn(`Could not access team ${team.name}:`, error.message);
                }
            }

            return allLists;
        } catch (error) {
            throw new Error(`Failed to find lists: ${error.message}`);
        }
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

    // Get a specific task by ID
    async getTask(taskId, includeSubtasks = false) {
        try {
            const params = new URLSearchParams();
            params.append('include_subtasks', includeSubtasks);
            
            const response = await this.client.get(`/task/${taskId}?${params.toString()}`);
            
            // Add URL to task
            const task = response.data;
            if (task && task.id) {
                task.url = `https://app.clickup.com/t/${task.id}`;
            }
            
            return task;
        } catch (error) {
            console.error('Get task error:', error.response?.data);
            throw new Error(`Failed to get task: ${error.response?.data?.err || error.message}`);
        }
    }

    // Get tasks from a specific list
    async getTasksFromList(listId, options = {}) {
        try {
            const {
                archived = false,
                page = 0,
                orderBy = 'updated',
                reverse = true,
                subtasks = false,
                statuses = [],
                includeClosed = false,
                assignees = [],
                tags = [],
                dueDateGt = null,
                dueDateLt = null,
                dateCreatedGt = null,
                dateCreatedLt = null,
                dateUpdatedGt = null,
                dateUpdatedLt = null
            } = options;

            const params = new URLSearchParams();
            
            params.append('archived', archived);
            params.append('page', page);
            params.append('order_by', orderBy);
            params.append('reverse', reverse);
            params.append('subtasks', subtasks);
            params.append('include_closed', includeClosed);

            // Add array filters
            if (statuses.length > 0) {
                statuses.forEach(status => params.append('statuses[]', status));
            }
            
            if (assignees.length > 0) {
                assignees.forEach(assignee => params.append('assignees[]', assignee));
            }
            
            if (tags.length > 0) {
                tags.forEach(tag => params.append('tags[]', tag));
            }

            // Date filters
            if (dueDateGt) params.append('due_date_gt', dueDateGt);
            if (dueDateLt) params.append('due_date_lt', dueDateLt);
            if (dateCreatedGt) params.append('date_created_gt', dateCreatedGt);
            if (dateCreatedLt) params.append('date_created_lt', dateCreatedLt);
            if (dateUpdatedGt) params.append('date_updated_gt', dateUpdatedGt);
            if (dateUpdatedLt) params.append('date_updated_lt', dateUpdatedLt);

            console.log(`Getting tasks from list ${listId}`);
            
            const response = await this.client.get(`/list/${listId}/task?${params.toString()}`);
            
            // Add URLs to tasks
            const tasks = response.data.tasks || [];
            tasks.forEach(task => {
                if (task.id) {
                    task.url = `https://app.clickup.com/t/${task.id}`;
                }
            });
            
            return {
                tasks: tasks,
                lastPage: response.data.last_page || false
            };
        } catch (error) {
            console.error('Get tasks from list error:', error.response?.data);
            throw new Error(`Failed to get tasks from list: ${error.response?.data?.err || error.message}`);
        }
    }
}

module.exports = new ClickUpService();