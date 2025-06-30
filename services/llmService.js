const axios = require('axios');
const contextService = require('./contextService');

class LLMService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
        
        // Using free models from OpenRouter
        this.model = 'deepseek/deepseek-r1-0528-qwen3-8b:free'; // Free model
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000', // Required for some free models
                'X-Title': 'ClickUp MCP Server'
            }
        });
    }

    async processDescription(description) {
        try {
            const prompt = this.buildPrompt(description);
            
            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that extracts structured information from issue descriptions to create well-formatted tickets. Always respond with valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            const content = response.data.choices[0].message.content;
            
            // Try to parse JSON response
            try {
                return JSON.parse(content);
            } catch (parseError) {
                // If JSON parsing fails, extract JSON from the response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw new Error('Failed to parse LLM response as JSON');
            }
            
        } catch (error) {
            console.error('LLM Service Error:', error.response?.data || error.message);
            
            // Fallback: return a basic structure if LLM fails
            return this.createFallbackStructure(description);
        }
    }

    async processSearchQuery(searchQuery) {
        try {
            const prompt = this.buildSearchPrompt(searchQuery);
            
            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that converts natural language search queries into structured search parameters for ClickUp tasks. Always respond with valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            });

            const content = response.data.choices[0].message.content;
            
            // Try to parse JSON response
            try {
                return JSON.parse(content);
            } catch (parseError) {
                // If JSON parsing fails, extract JSON from the response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw new Error('Failed to parse LLM response as JSON');
            }
            
        } catch (error) {
            console.error('LLM Search Service Error:', error.response?.data || error.message);
            
            // Fallback: return a basic search structure if LLM fails
            return this.createFallbackSearchStructure(searchQuery);
        }
    }

    buildPrompt(description) {
        const contextPrompt = contextService.buildContextPrompt();
        
        return `
You are an expert engineering project manager. Analyze the following user description and create a well-structured engineering ticket.

${contextPrompt}

INSTRUCTIONS:
1. Determine the ticket type (bug, feature, task, improvement, spike)
2. Extract key information and structure it professionally
3. Create proper acceptance criteria for engineering work
4. Identify technical considerations and scope
5. Suggest appropriate tags and priority

Return ONLY a JSON object with this exact structure:

{
    "title": "Clear, actionable title (max 80 chars)",
    "type": "bug|feature|task|improvement|spike",
    "priority": "urgent|high|normal|low",
    "summary": "Brief 1-2 sentence summary",
    "description": "Detailed technical description",
    "stepsToReproduce": ["step1", "step2"] or null,
    "expectedBehavior": "What should happen" or null,
    "actualBehavior": "What currently happens" or null,
    "acceptanceCriteria": ["criteria1", "criteria2"],
    "technicalNotes": "Technical considerations, dependencies, etc." or null,
    "testingNotes": "How to test this work" or null,
    "tags": ["tag1", "tag2"],
    "estimatedComplexity": "low|medium|high",
    "estimatedHours": number or null,
    "dependencies": ["dependency1"] or null,
    "affectedComponents": ["component1"] or null
}

TICKET TYPE GUIDELINES:
- **bug**: Something is broken or not working as expected
- **feature**: New functionality or enhancement
- **task**: General work item, maintenance, or non-feature work
- **improvement**: Optimization, refactoring, or enhancement of existing functionality
- **spike**: Research, investigation, or proof of concept work

PRIORITY GUIDELINES:
- **urgent**: Critical production issue, security vulnerability
- **high**: Important feature, significant bug affecting users
- **normal**: Standard feature work, minor bugs
- **low**: Nice-to-have, minor improvements

USER DESCRIPTION:
${description}

Analyze the description carefully and create a professional engineering ticket. Focus on making it actionable for developers.`;
    }

    buildSearchPrompt(searchQuery) {
        return `
You are an expert at converting natural language search queries into structured search parameters for ClickUp tasks.

Analyze the following search query and extract relevant search parameters:

SEARCH QUERY: "${searchQuery}"

Convert this into a JSON object with the following structure:

{
    "query": "main search terms (keywords from the query)",
    "assignees": ["username1", "username2"] or [],
    "statuses": ["status1", "status2"] or [],
    "tags": ["tag1", "tag2"] or [],
    "dateCreatedGt": "timestamp" or null,
    "dateCreatedLt": "timestamp" or null,
    "dateUpdatedGt": "timestamp" or null,
    "dateUpdatedLt": "timestamp" or null,
    "dueDateGt": "timestamp" or null,
    "dueDateLt": "timestamp" or null,
    "priority": "urgent|high|normal|low" or null,
    "orderBy": "created|updated|due_date|priority",
    "reverse": true|false
}

EXTRACTION RULES:
1. **Query**: Extract main keywords, remove filter words like "assigned to", "created", "status", etc.
2. **Assignees**: Look for "assigned to X", "by X", "for X" - extract usernames/names
3. **Statuses**: Look for status keywords like "open", "in progress", "done", "closed", "todo", "complete"
4. **Tags**: Look for "tagged with", "tag:", "label:" followed by tag names
5. **Dates**: Convert relative dates like "last week", "yesterday", "this month" to timestamps
   - Use Unix timestamps (milliseconds since epoch)
   - "last week" = 7 days ago to now
   - "yesterday" = yesterday 00:00 to 23:59
   - "this month" = first day of current month to now
   - "last month" = first day to last day of previous month
6. **Priority**: Look for "urgent", "high priority", "low priority", etc.
7. **Ordering**: Default to "updated" with reverse=true (newest first)

EXAMPLES:
- "bugs assigned to john" results in {"query": "bugs", "assignees": ["john"]}
- "high priority tasks created last week" results in {"query": "tasks", "priority": "high", "dateCreatedGt": timestamp_7_days_ago}
- "completed tickets tagged frontend" results in {"query": "tickets", "statuses": ["complete", "done"], "tags": ["frontend"]}

Return ONLY the JSON object, no explanations.`;
    }

    createFallbackStructure(description) {
        // Enhanced fallback when LLM is not available
        const words = description.toLowerCase();
        
        let type = 'task';
        if (words.includes('bug') || words.includes('error') || words.includes('issue') || words.includes('problem') || words.includes('broken')) {
            type = 'bug';
        } else if (words.includes('feature') || words.includes('add') || words.includes('new') || words.includes('implement')) {
            type = 'feature';
        } else if (words.includes('improve') || words.includes('enhance') || words.includes('optimize') || words.includes('refactor')) {
            type = 'improvement';
        } else if (words.includes('research') || words.includes('investigate') || words.includes('spike') || words.includes('explore')) {
            type = 'spike';
        }

        let priority = 'normal';
        if (words.includes('urgent') || words.includes('critical') || words.includes('asap') || words.includes('production')) {
            priority = 'urgent';
        } else if (words.includes('high') || words.includes('important') || words.includes('blocking')) {
            priority = 'high';
        } else if (words.includes('low') || words.includes('minor') || words.includes('nice')) {
            priority = 'low';
        }

        const title = description.split('\n')[0].substring(0, 80) || 'New Engineering Ticket';
        
        return {
            title: title,
            type: type,
            priority: priority,
            summary: `${type.charAt(0).toUpperCase() + type.slice(1)} work item`,
            description: description,
            stepsToReproduce: type === 'bug' ? ['To be defined'] : null,
            expectedBehavior: type === 'bug' ? 'To be defined' : null,
            actualBehavior: type === 'bug' ? 'To be defined' : null,
            acceptanceCriteria: ['Work is completed as described', 'Code is tested and reviewed'],
            technicalNotes: null,
            testingNotes: 'Manual testing required',
            tags: [type, 'auto-generated'],
            estimatedComplexity: 'medium',
            estimatedHours: null,
            dependencies: null,
            affectedComponents: null
        };
    }

    createFallbackSearchStructure(searchQuery) {
        // Enhanced fallback when LLM is not available
        const words = searchQuery.toLowerCase().split(/\s+/);
        
        const result = {
            query: searchQuery,
            assignees: [],
            statuses: [],
            tags: [],
            dateCreatedGt: null,
            dateCreatedLt: null,
            dateUpdatedGt: null,
            dateUpdatedLt: null,
            dueDateGt: null,
            dueDateLt: null,
            priority: null,
            orderBy: 'updated',
            reverse: true
        };

        // Extract assignees
        const assigneeIndex = words.findIndex(word => 
            ['assigned', 'assignee', 'by', 'for'].includes(word)
        );
        if (assigneeIndex !== -1 && assigneeIndex < words.length - 1) {
            result.assignees = [words[assigneeIndex + 1]];
        }

        // Extract statuses
        const statusKeywords = {
            'open': ['open', 'todo', 'new'],
            'in progress': ['progress', 'working', 'active'],
            'done': ['done', 'complete', 'completed', 'finished', 'closed']
        };
        
        for (const [status, keywords] of Object.entries(statusKeywords)) {
            if (keywords.some(keyword => words.includes(keyword))) {
                result.statuses.push(status);
            }
        }

        // Extract priority
        if (words.includes('urgent') || words.includes('critical')) {
            result.priority = 'urgent';
        } else if (words.includes('high')) {
            result.priority = 'high';
        } else if (words.includes('low')) {
            result.priority = 'low';
        }

        // Extract basic date ranges
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        
        if (words.includes('today')) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            result.dateCreatedGt = startOfDay.getTime();
        } else if (words.includes('yesterday')) {
            const yesterday = new Date(now - dayMs);
            yesterday.setHours(0, 0, 0, 0);
            result.dateCreatedGt = yesterday.getTime();
            result.dateCreatedLt = yesterday.getTime() + dayMs;
        } else if (words.includes('week')) {
            result.dateCreatedGt = now - (7 * dayMs);
        } else if (words.includes('month')) {
            result.dateCreatedGt = now - (30 * dayMs);
        }

        return result;
    }

    async testConnection() {
        try {
            const response = await this.client.get('/models');
            return { success: true, models: response.data.data.slice(0, 5) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new LLMService();