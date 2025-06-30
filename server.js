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
        const { description, priority = 'normal', assignee = null } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        console.log('Processing ticket creation request:', { description, priority, assignee });

        // Process the ticket using LLM and create in ClickUp
        const processedTicket = await llmService.processDescription(description);
        const ticketData = templateService.applyTemplate(processedTicket, { priority, assignee });
        const createdTicket = await clickupService.createTask(ticketData);
        
        res.json({
            success: true,
            ticket: createdTicket,
            processed: processedTicket
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


// Search tickets with natural language
app.post('/api/search-tickets', async (req, res) => {
    try {
        const { query, teamId } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        console.log('Processing search request:', { query, teamId });

        // Process the natural language query using LLM
        const searchParams = await llmService.processSearchQuery(query);
        
        // Use the provided teamId or fall back to environment variable
        const searchTeamId = teamId || process.env.CLICKUP_TEAM_ID;
        
        if (!searchTeamId) {
            return res.status(400).json({ 
                error: 'Team ID is required for searching. Please provide teamId or set CLICKUP_TEAM_ID in your environment.' 
            });
        }

        // Search tasks using the processed parameters
        const searchResults = await clickupService.searchTasks(searchParams.query, {
            teamId: searchTeamId,
            assignees: searchParams.assignees,
            statuses: searchParams.statuses,
            tags: searchParams.tags,
            dateCreatedGt: searchParams.dateCreatedGt,
            dateCreatedLt: searchParams.dateCreatedLt,
            dateUpdatedGt: searchParams.dateUpdatedGt,
            dateUpdatedLt: searchParams.dateUpdatedLt,
            dueDateGt: searchParams.dueDateGt,
            dueDateLt: searchParams.dueDateLt,
            orderBy: searchParams.orderBy,
            reverse: searchParams.reverse
        });
        
        res.json({
            success: true,
            query: query,
            searchParams: searchParams,
            results: searchResults.tasks,
            totalFound: searchResults.tasks.length,
            lastPage: searchResults.lastPage
        });
        
    } catch (error) {
        console.error('Error searching tickets:', error);
        res.status(500).json({ 
            error: 'Failed to search tickets', 
            details: error.message 
        });
    }
});


// Unified MCP endpoint - intelligently routes between search and create
app.post('/mcp', async (req, res) => {
    try {
        const { prompt, teamId } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log('Processing MCP request:', { prompt, teamId });

        // Use LLM to determine intent and extract parameters
        const intent = await llmService.determineIntent(prompt);
        console.log("INTENT: ", intent)
        
        if (intent.action === 'search') {
            // Search for tickets
            const searchParams = await llmService.processSearchQuery(prompt);
            const searchTeamId = teamId || process.env.CLICKUP_TEAM_ID;
            
            if (!searchTeamId) {
                return res.status(400).json({ 
                    error: 'Team ID is required for searching. Please provide teamId or set CLICKUP_TEAM_ID in your environment.' 
                });
            }

            const searchResults = await clickupService.searchTasks(searchParams.query, {
                teamId: searchTeamId,
                assignees: searchParams.assignees,
                statuses: searchParams.statuses,
                tags: searchParams.tags,
                dateCreatedGt: searchParams.dateCreatedGt,
                dateCreatedLt: searchParams.dateCreatedLt,
                dateUpdatedGt: searchParams.dateUpdatedGt,
                dateUpdatedLt: searchParams.dateUpdatedLt,
                dueDateGt: searchParams.dueDateGt,
                dueDateLt: searchParams.dueDateLt,
                orderBy: searchParams.orderBy,
                reverse: searchParams.reverse
            });
            
            res.json({
                success: true,
                action: 'search',
                query: prompt,
                searchParams: searchParams,
                results: searchResults.tasks,
                totalFound: searchResults.tasks.length,
                lastPage: searchResults.lastPage
            });
            
        } else if (intent.action === 'create') {
            // Create a ticket
            const processedTicket = await llmService.processDescription(prompt);
            const ticketData = templateService.applyTemplate(processedTicket, { 
                priority: intent.priority || 'normal', 
                assignee: intent.assignee || null 
            });
            // const createdTicket = await clickupService.createTask(ticketData);
            
            res.json({
                success: true,
                action: 'create',
                prompt: prompt,
                // ticket: createdTicket,
                processed: processedTicket
            });
            
        } else {
            return res.status(400).json({ 
                error: 'Could not determine intent from prompt. Please be more specific about whether you want to search for tickets or create a new one.' 
            });
        }
        
    } catch (error) {
        console.error('Error processing MCP request:', error);
        res.status(500).json({ 
            error: 'Failed to process request', 
            details: error.message 
        });
    }
});

// MCP interface route
app.get('/mcp', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mcp.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 ClickUp MCP Server running on http://localhost:${PORT}`);
    console.log(`📝 Open the web interface to start creating tickets`);
    console.log(`🤖 Use the MCP interface at http://localhost:${PORT}/mcp`);
});