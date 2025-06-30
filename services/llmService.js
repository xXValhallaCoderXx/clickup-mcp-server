const axios = require('axios');
const contextService = require('./contextService');

class LLMService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
        
        // Using more reliable free models from OpenRouter
        this.models = [
            'mistralai/mistral-small-3.2-24b-instruct:free',
            'minimax/minimax-m1:extended',
            'deepseek/deepseek-r1-0528-qwen3-8b:free'
        ];
        this.currentModelIndex = 0;
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000', // Required for some free models
                'X-Title': 'ClickUp MCP Server'
            },
            timeout: 30000 // 30 second timeout
        });
    }

    getCurrentModel() {
        return this.models[this.currentModelIndex];
    }

    tryNextModel() {
        this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
        console.log(`Switching to model: ${this.getCurrentModel()}`);
    }

    parseJsonResponse(content) {
        // Try direct JSON parsing first
        try {
            const parsed = JSON.parse(content);
            // Validate the structure
            if (parsed && typeof parsed === 'object' && parsed.action) {
                return parsed;
            }
        } catch (parseError) {
            console.log("Direct JSON Parse Error:", parseError.message);
        }

        // Clean the content more aggressively
        let cleanContent = content
            // Remove markdown code blocks
            .replace(/```json\s*/g, '')
            .replace(/\s*```/g, '')
            .replace(/```/g, '')
            // Remove common problematic characters (non-ASCII)
            .replace(/[^\x00-\x7F]/g, '')
            .trim();

        // Try to find JSON object in the cleaned response
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            let jsonString = jsonMatch[0];

            try {
                const parsed = JSON.parse(jsonString);
                if (parsed && typeof parsed === 'object' && parsed.action) {
                    return parsed;
                }
            } catch (secondParseError) {
                console.log("Second JSON Parse Error:", secondParseError.message);

                // Try to fix common JSON issues
                jsonString = jsonString
                    .replace(/'/g, '"')  // Replace single quotes with double quotes
                    .replace(/(\w+):/g, '"$1":')  // Add quotes around keys
                    .replace(/,\s*}/g, '}')  // Remove trailing commas
                    .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
                    .replace(/"\s*:\s*([^",\{\[\]]+)\s*([,\}])/g, '": "$1"$2') // Quote unquoted string values
                    .replace(/": "(\d+)"([,\}])/g, '": $1$2') // Unquote numeric values
                    .replace(/": "(true|false|null)"([,\}])/g, '": $1$2'); // Unquote boolean/null values

                try {
                    const parsed = JSON.parse(jsonString);
                    if (parsed && typeof parsed === 'object' && parsed.action) {
                        return parsed;
                    }
                } catch (finalParseError) {
                    console.log("Final JSON Parse Error:", finalParseError.message);
                }
            }
        }

        // Last resort: try to extract key-value pairs manually
        try {
            const actionMatch = content.match(/"action"\s*:\s*"([^"]+)"/);
            const confidenceMatch = content.match(/"confidence"\s*:\s*([0-9.]+)/);
            const reasoningMatch = content.match(/"reasoning"\s*:\s*"([^"]+)"/);
            const priorityMatch = content.match(/"priority"\s*:\s*"?([^",\}]+)"?/);
            const assigneeMatch = content.match(/"assignee"\s*:\s*"?([^",\}]+)"?/);

            if (actionMatch) {
                const result = {
                    action: actionMatch[1],
                    confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7,
                    reasoning: reasoningMatch ? reasoningMatch[1] : 'Extracted from malformed JSON',
                    priority: priorityMatch && priorityMatch[1] !== 'null' ? priorityMatch[1] : null,
                    assignee: assigneeMatch && assigneeMatch[1] !== 'null' ? assigneeMatch[1] : null
                };
                console.log("Manually extracted JSON:", result);
                return result;
            }
        } catch (extractError) {
            console.log("Manual extraction failed:", extractError.message);
        }

        return null;
    }

    async processDescription(description) {
        // First check if we have an API key
        if (!this.apiKey) {
            console.log("No OpenRouter API key found, using fallback description processing");
            return this.createFallbackStructure(description);
        }

        try {
            const prompt = this.buildPrompt(description);
            
            const response = await this.client.post('/chat/completions', {
                model: this.getCurrentModel(),
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that extracts structured information from issue descriptions to create well-formatted tickets. You MUST respond with ONLY valid JSON, no explanations or markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            // Check if we got a valid response
            if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                throw new Error('Invalid response structure from LLM API');
            }

            const content = response.data.choices[0].message.content?.trim();

            // Check for empty content
            if (!content) {
                throw new Error('Empty response from LLM API');
            }

            // Try to parse JSON response using the shared parser
            const result = this.parseJsonResponse(content);
            if (result) {
                return result;
            }
            
            throw new Error('Failed to parse LLM response as JSON');

        } catch (error) {
            console.error('LLM Service Error:', error.response?.data || error.message);
            
            // Fallback: return a basic structure if LLM fails
            return this.createFallbackStructure(description);
        }
    }

    async processSearchQuery(searchQuery) {
        // First check if we have an API key
        if (!this.apiKey) {
            console.log("No OpenRouter API key found, using fallback search processing");
            return this.createFallbackSearchStructure(searchQuery);
        }

        try {
            const prompt = this.buildSearchPrompt(searchQuery);
            
            const response = await this.client.post('/chat/completions', {
                model: this.getCurrentModel(),
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that converts natural language search queries into structured search parameters for ClickUp tasks. You MUST respond with ONLY valid JSON, no explanations or markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            });

            // Check if we got a valid response
            if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                throw new Error('Invalid response structure from LLM API');
            }

            const content = response.data.choices[0].message.content?.trim();

            // Check for empty content
            if (!content) {
                throw new Error('Empty response from LLM API');
            }
            
            // Try to parse JSON response using the shared parser
            const result = this.parseJsonResponse(content);
            if (result) {
                return result;
            }

            throw new Error('Failed to parse LLM response as JSON');
            
        } catch (error) {
            console.error('LLM Search Service Error:', error.response?.data || error.message);
            
            // Fallback: return a basic search structure if LLM fails
            return this.createFallbackSearchStructure(searchQuery);
        }
    }

    async determineIntent(prompt) {
        // First check if we have an API key
        if (!this.apiKey) {
            console.log("No OpenRouter API key found, using fallback intent detection");
            return this.createFallbackIntent(prompt);
        }

        let lastError = null;

        // Try each model in sequence
        for (let attempt = 0; attempt < this.models.length; attempt++) {
            try {
                const currentModel = this.getCurrentModel();
                console.log(`Attempting intent detection with model: ${currentModel}`);

                const intentPrompt = this.buildIntentPrompt(prompt);

                const response = await this.client.post('/chat/completions', {
                    model: currentModel,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that determines user intent for ticket management. You MUST respond with ONLY valid JSON, no explanations or markdown formatting.'
                        },
                        {
                            role: 'user',
                            content: intentPrompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 200
                });

                // Check if we got a valid response
                if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                    throw new Error('Invalid response structure from LLM API');
                }

                const content = response.data.choices[0].message.content?.trim();
                console.log(`Model ${currentModel} response:`, content);

                // Check for empty content
                if (!content) {
                    throw new Error('Empty response from LLM API');
                }

                // Try to parse JSON response
                const result = this.parseJsonResponse(content);
                if (result) {
                    console.log(`Successfully parsed intent with model: ${currentModel}`);
                    return result;
                }

                throw new Error('Failed to parse JSON response');

            } catch (error) {
                lastError = error;
                console.error(`Model ${this.getCurrentModel()} failed:`, error.response?.data || error.message);

                // Try next model
                this.tryNextModel();
            }
        }

        console.error('All LLM models failed for intent detection, using fallback');
        console.error('Last error:', lastError?.message);

        // Fallback: return a basic intent structure if all LLMs fail
        return this.createFallbackIntent(prompt);
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

    buildIntentPrompt(prompt) {
        return `Analyze the following user prompt and determine if they want to SEARCH for existing tickets or CREATE a new ticket.

USER PROMPT: "${prompt}"

INTENT CLASSIFICATION RULES:

**SEARCH Intent** - User wants to find existing tickets:
- Keywords: "find", "search", "show me", "list", "get", "what", "which", "who has", "assigned to"
- Examples: 
  - "find bugs assigned to john"
  - "show me high priority tasks"
  - "what tickets were created last week"
  - "search for frontend issues"

**CREATE Intent** - User wants to create a new ticket:
- Keywords: "create", "add", "new", "make", "build", "implement", "fix", "bug:", "issue:", "feature:"
- Describes a problem, feature request, or task
- Examples:
  - "create a ticket for login bug"
  - "the save button is broken"
  - "add dark mode to the app"
  - "implement user authentication"

**Priority Extraction** (if mentioned):
- "urgent", "critical", "asap" leads to urgent
- "high", "important" leads to high  
- "low", "minor" leads to low
- default leads to normal

**Assignee Extraction** (if mentioned):
- Look for "assign to X", "for X", "@X"

If unclear, default to "create" with confidence < 0.7.

IMPORTANT: Respond with ONLY a valid JSON object. No explanations, no markdown, no code blocks. Just the JSON:

{
    "action": "search|create",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "priority": "urgent|high|normal|low" or null,
    "assignee": "username" or null
}`;
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
        const words = searchQuery.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
        
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
            result.query = words.filter(word => !['today', 'created', 'tickets', 'any', 'are', 'there', 'new'].includes(word)).join(' ') || 'tickets';
        } else if (words.includes('yesterday')) {
            const yesterday = new Date(now - dayMs);
            yesterday.setHours(0, 0, 0, 0);
            result.dateCreatedGt = yesterday.getTime();
            result.dateCreatedLt = yesterday.getTime() + dayMs;
            result.query = words.filter(word => !['yesterday', 'created', 'tickets', 'any', 'are', 'there'].includes(word)).join(' ') || 'tickets';
        } else if (words.includes('week')) {
            result.dateCreatedGt = now - (7 * dayMs);
            result.query = words.filter(word => !['week', 'last', 'this', 'created', 'tickets', 'any', 'are', 'there'].includes(word)).join(' ') || 'tickets';
        } else if (words.includes('month')) {
            result.dateCreatedGt = now - (30 * dayMs);
            result.query = words.filter(word => !['month', 'last', 'this', 'created', 'tickets', 'any', 'are', 'there'].includes(word)).join(' ') || 'tickets';
        } else {
            // Clean up the query by removing common search words
            result.query = words.filter(word => !['are', 'there', 'any', 'new', 'tickets', 'created'].includes(word)).join(' ') || 'tickets';
        }

        return result;
    }

    createFallbackIntent(prompt) {
        const words = prompt.toLowerCase();
        
        // Enhanced keyword-based intent detection
        const searchKeywords = ['find', 'search', 'show', 'list', 'get', 'what', 'which', 'who has', 'assigned to', 'are there', 'any', 'tickets', 'created', 'updated', 'today', 'yesterday', 'this week', 'last week'];
        const createKeywords = ['create', 'add', 'new', 'make', 'build', 'implement', 'fix', 'bug', 'issue', 'feature', 'broken', 'error', 'problem'];

        // Special patterns that strongly indicate search intent
        const searchPatterns = [
            /are there.*tickets/i,
            /what.*tickets/i,
            /show.*tickets/i,
            /list.*tickets/i,
            /find.*tickets/i,
            /tickets.*created/i,
            /tickets.*updated/i,
            /any.*tickets/i
        ];

        // Check for strong search patterns first
        const hasSearchPattern = searchPatterns.some(pattern => pattern.test(prompt));
        
        const searchScore = searchKeywords.reduce((score, keyword) => 
            words.includes(keyword) ? score + 1 : score, 0);
        const createScore = createKeywords.reduce((score, keyword) => 
            words.includes(keyword) ? score + 1 : score, 0);
        
        let action = 'create'; // Default to create
        let confidence = 0.5;
        
        // If we have a strong search pattern, prioritize search
        if (hasSearchPattern) {
            action = 'search';
            confidence = 0.9;
        } else if (searchScore > createScore) {
            action = 'search';
            confidence = Math.min(0.9, 0.5 + (searchScore * 0.1));
        } else if (createScore > 0) {
            action = 'create';
            confidence = Math.min(0.9, 0.5 + (createScore * 0.1));
        }
        
        // Extract priority
        let priority = null;
        if (words.includes('urgent') || words.includes('critical') || words.includes('asap')) {
            priority = 'urgent';
        } else if (words.includes('high') || words.includes('important')) {
            priority = 'high';
        } else if (words.includes('low') || words.includes('minor')) {
            priority = 'low';
        }
        
        // Extract assignee (simple pattern matching)
        let assignee = null;
        const assigneeMatch = prompt.match(/(?:assign(?:ed)?\s+to|for|@)\s+(\w+)/i);
        if (assigneeMatch) {
            assignee = assigneeMatch[1];
        }
        
        return {
            action,
            confidence,
            reasoning: `Fallback classification based on keyword analysis. Search keywords: ${searchScore}, Create keywords: ${createScore}${hasSearchPattern ? ', Strong search pattern detected' : ''}`,
            priority,
            assignee
        };
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