const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const clickupService = require('./services/clickupService');
const llmService = require('./services/llmService');
const templateService = require('./services/templateService');
const contextService = require('./services/contextService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.post('/api/create-ticket', async (req, res) => {
    try {
        const { description, priority = 'normal', assignee = null, useN8N = true } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        console.log('Processing ticket creation request:', { description, priority, assignee, useN8N });

        if (useN8N && process.env.N8N_WEBHOOK_URL) {
            // Use N8N workflow
            try {
                const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, {
                    description,
                    priority,
                    assignee,
                    listId: process.env.CLICKUP_LIST_ID
                });
                
                res.json(n8nResponse.data);
                return;
            } catch (n8nError) {
                console.warn('N8N workflow failed, falling back to direct processing:', n8nError.message);
                // Fall through to direct processing
            }
        }

        // Direct processing (fallback or when N8N is disabled)
        const processedTicket = await llmService.processDescription(description);
        const ticketData = templateService.applyTemplate(processedTicket, { priority, assignee });
        const createdTicket = await clickupService.createTask(ticketData);
        
        res.json({
            success: true,
            ticket: createdTicket,
            processed: processedTicket,
            method: 'direct'
        });
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ 
            error: 'Failed to create ticket', 
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test ClickUp connection
app.get('/api/test-clickup', async (req, res) => {
    try {
        const teams = await clickupService.getTeams();
        res.json({ success: true, teams });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get ClickUp workspace structure
app.get('/api/clickup/structure', async (req, res) => {
    try {
        const teams = await clickupService.getTeams();
        const structure = [];
        
        for (const team of teams.slice(0, 3)) { // Limit to first 3 teams
            try {
                const spaces = await clickupService.getSpaces(team.id);
                const teamData = {
                    id: team.id,
                    name: team.name,
                    spaces: []
                };
                
                for (const space of spaces.slice(0, 5)) { // Limit to first 5 spaces
                    try {
                        const folders = await clickupService.getFolders(space.id);
                        const spaceData = {
                            id: space.id,
                            name: space.name,
                            folders: []
                        };
                        
                        for (const folder of folders.slice(0, 5)) { // Limit to first 5 folders
                            try {
                                const lists = await clickupService.getLists(folder.id);
                                spaceData.folders.push({
                                    id: folder.id,
                                    name: folder.name,
                                    lists: lists.slice(0, 10).map(list => ({
                                        id: list.id,
                                        name: list.name
                                    }))
                                });
                            } catch (error) {
                                console.warn(`Failed to get lists for folder ${folder.id}:`, error.message);
                            }
                        }
                        
                        teamData.spaces.push(spaceData);
                    } catch (error) {
                        console.warn(`Failed to get folders for space ${space.id}:`, error.message);
                    }
                }
                
                structure.push(teamData);
            } catch (error) {
                console.warn(`Failed to get spaces for team ${team.id}:`, error.message);
            }
        }
        
        res.json({ success: true, structure });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test LLM connection
app.get('/api/test-llm', async (req, res) => {
    try {
        const result = await llmService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available templates
app.get('/api/templates', (req, res) => {
    const templates = {
        bug: {
            name: 'Bug Report',
            description: 'For reporting software bugs and issues',
            example: 'When I click the save button, I get a 500 error...'
        },
        feature: {
            name: 'Feature Request',
            description: 'For requesting new features or enhancements',
            example: 'Add a dark mode toggle to the navigation bar...'
        },
        task: {
            name: 'Task',
            description: 'For general tasks and work items',
            example: 'Update the user documentation for the new API...'
        },
        improvement: {
            name: 'Improvement',
            description: 'For optimizations and improvements',
            example: 'Optimize the database queries for better performance...'
        }
    };
    
    res.json({ success: true, templates });
});

// Extract List ID from ClickUp URL
app.post('/api/extract-list-id', (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        const listId = clickupService.constructor.extractListIdFromUrl(url);
        
        if (listId) {
            res.json({ 
                success: true, 
                listId,
                message: `Extracted List ID: ${listId}`
            });
        } else {
            res.status(400).json({ 
                error: 'Could not extract List ID from URL. Please check the URL format.' 
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Find all accessible lists
app.get('/api/find-lists', async (req, res) => {
    try {
        const lists = await clickupService.findAllLists();
        res.json({ 
            success: true, 
            lists: lists.map(list => ({
                id: list.id,
                name: list.name,
                teamName: list.teamName,
                spaceName: list.spaceName,
                folderName: list.folderName || null,
                location: list.location
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify specific list access
app.post('/api/verify-list', async (req, res) => {
    try {
        const { listId } = req.body;
        
        if (!listId) {
            return res.status(400).json({ error: 'List ID is required' });
        }
        
        const listData = await clickupService.verifyListAccess(listId);
        res.json({ 
            success: true, 
            list: {
                id: listData.id,
                name: listData.name,
                status: listData.status,
                permission_level: listData.permission_level
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Context management endpoints
app.get('/api/context', (req, res) => {
    try {
        const context = contextService.getCompanyContext();
        const stats = contextService.getContextStats();
        res.json({ 
            success: true, 
            context,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/context', (req, res) => {
    try {
        const { context } = req.body;
        
        if (!context) {
            return res.status(400).json({ error: 'Context content is required' });
        }
        
        const result = contextService.saveCompanyContext(context);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/context/stats', (req, res) => {
    try {
        const stats = contextService.getContextStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 ClickUp MCP Server running on http://localhost:${PORT}`);
    console.log(`📝 Open the web interface to start creating tickets`);
});