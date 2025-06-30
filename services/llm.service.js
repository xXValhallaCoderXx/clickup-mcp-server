const axios = require('axios');
const contextService = require('./context.service');

class LLMService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
        
        // Using the working model
        this.models = [
            'google/gemini-2.0-flash-001'
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
        console.log("CONTENT: ", content);
        
        // Step 1: Try direct JSON parsing first
        try {
            const parsed = JSON.parse(content);
            // Validate the structure - check for both intent and search response structures
            if (parsed && typeof parsed === "object" && (parsed.action || parsed.query !== undefined)) {
                return parsed;
            }
        } catch (parseError) {
            console.log("Direct JSON Parse Error:", parseError.message);
        }

        // Step 2: Clean markdown and try again
        let cleanContent = content;
        
        // Remove markdown code blocks more aggressively
        cleanContent = cleanContent
            .replace(/^```json\s*/gm, '')  // Remove opening ```json
            .replace(/^```\s*/gm, '')      // Remove opening ```
            .replace(/\s*```$/gm, '')      // Remove closing ```
            .replace(/```/g, '')           // Remove any remaining ```
            .trim();

        console.log("CLEANED CONTENT:", cleanContent);

        // Step 3: Try parsing the cleaned content
        try {
            const parsed = JSON.parse(cleanContent);
            if (parsed && typeof parsed === "object" && (parsed.action || parsed.query !== undefined)) {
                console.log("Successfully parsed cleaned JSON");
                return parsed;
            }
        } catch (cleanParseError) {
            console.log("Cleaned JSON Parse Error:", cleanParseError.message);
        }

        // Step 4: Extract JSON object from mixed content
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            let jsonString = jsonMatch[0];
            console.log("EXTRACTED JSON STRING:", jsonString);

            try {
                const parsed = JSON.parse(jsonString);
                if (parsed && typeof parsed === "object" && (parsed.action || parsed.query !== undefined)) {
                    console.log("Successfully parsed extracted JSON");
                    return parsed;
                }
            } catch (extractParseError) {
                console.log("Extract JSON Parse Error:", extractParseError.message);
            }
        }

        // Step 5: Manual extraction for intent responses only
        if (content.includes('"action"')) {
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
                        reasoning: reasoningMatch ? reasoningMatch[1] : "Extracted from malformed JSON",
                        priority: priorityMatch && priorityMatch[1] !== "null" ? priorityMatch[1] : null,
                        assignee: assigneeMatch && assigneeMatch[1] !== "null" ? assigneeMatch[1] : null,
                    };
                    console.log("Manually extracted intent JSON:", result);
                    return result;
                }
            } catch (extractError) {
                console.log("Manual extraction failed:", extractError.message);
            }
        }

        console.log("All JSON parsing attempts failed");
        return null;
    }

    async processDescription(description) {
        // Check if we have an API key
        if (!this.apiKey) {
            throw new Error('LLM service unavailable: No OpenRouter API key configured');
        }

        try {
            const prompt = this.buildPrompt(description);
            
            const response = await this.client.post('/chat/completions', {
                model: this.getCurrentModel(),
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that extracts structured information from issue descriptions to create well-formatted tickets. CRITICAL: Respond with ONLY raw JSON - no markdown code blocks, no backticks, no explanations, just the JSON object.'
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
                throw new Error('LLM service unavailable: Invalid response structure from API');
            }

            const content = response.data.choices[0].message.content?.trim();
            
            // Check for empty content
            if (!content) {
                throw new Error('LLM service unavailable: Empty response from API');
            }
            
            // Try to parse JSON response using the shared parser
            const result = this.parseJsonResponse(content);
            if (result) {
                return result;
            }
            
            throw new Error('LLM service unavailable: Failed to parse response as valid JSON');
            
        } catch (error) {
            console.error('LLM Service Error:', error.response?.data || error.message);
            
            // Re-throw with service unavailable message
            if (error.message.startsWith('LLM service unavailable:')) {
                throw error;
            }
            throw new Error('LLM service unavailable: ' + (error.response?.data?.error?.message || error.message));
        }
    }

    async processSearchQuery(searchQuery) {
        // Check if we have an API key
        if (!this.apiKey) {
            throw new Error('LLM service unavailable: No OpenRouter API key configured');
        }

        try {
            const prompt = this.buildSearchPrompt(searchQuery);
            
            const response = await this.client.post('/chat/completions', {
                model: this.getCurrentModel(),
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that converts natural language search queries into structured search parameters for ClickUp tasks. CRITICAL: Respond with ONLY raw JSON - no markdown code blocks, no backticks, no explanations, just the JSON object.'
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
                throw new Error('LLM service unavailable: Invalid response structure from API');
            }

            const content = response.data.choices[0].message.content?.trim();
            console.log("CONTENT: ", content);
            
            // Check for empty content
            if (!content) {
                throw new Error('LLM service unavailable: Empty response from API');
            }
            
            // Try to parse JSON response using the shared parser
            const result = this.parseJsonResponse(content);
            if (result) {
                return result;
            }
            
            throw new Error('LLM service unavailable: Failed to parse response as valid JSON');
            
        } catch (error) {
            console.error('LLM Search Service Error:', error.response?.data || error.message);
            
            // Re-throw with service unavailable message
            if (error.message.startsWith('LLM service unavailable:')) {
                throw error;
            }
            throw new Error('LLM service unavailable: ' + (error.response?.data?.error?.message || error.message));
        }
    }

    async determineIntent(prompt) {
        // Check if we have an API key
        if (!this.apiKey) {
            throw new Error('LLM service unavailable: No OpenRouter API key configured');
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
                            content: 'You are a helpful assistant that determines user intent for ticket management. CRITICAL: Respond with ONLY raw JSON - no markdown code blocks, no backticks, no explanations, just the JSON object.'
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
        
        console.error('All LLM models failed for intent detection');
        console.error('Last error:', lastError?.message);
        
        // No fallback - throw error
        throw new Error('LLM service unavailable: All models failed to determine intent - ' + (lastError?.response?.data?.error?.message || lastError?.message));
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
    "reverse": true|false,
    "limit": number or null
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
7. **Ordering**: Detect ordering preferences from keywords:
   - "newest", "latest", "recent" -> orderBy: "created", reverse: true
   - "oldest", "first" -> orderBy: "created", reverse: false
   - "updated", "modified" -> orderBy: "updated", reverse: true
   - "priority" -> orderBy: "priority", reverse: true
   - Default: orderBy: "updated", reverse: true
8. **Limit**: Extract numbers from phrases like:
   - "10 newest tickets" -> limit: 10
   - "first 5 bugs" -> limit: 5
   - "top 20 tasks" -> limit: 20
   - "last 3 tickets" -> limit: 3
   - If no number specified, limit: null (use default)

EXAMPLES:
- "bugs assigned to john" results in {"query": "bugs", "assignees": ["john"], "limit": null}
- "10 newest tickets" results in {"query": "tickets", "orderBy": "created", "reverse": true, "limit": 10}
- "first 5 high priority tasks" results in {"query": "tasks", "priority": "high", "orderBy": "created", "reverse": false, "limit": 5}
- "last 3 tickets created today" results in {"query": "tickets", "dateCreatedGt": today_timestamp, "orderBy": "created", "reverse": true, "limit": 3}
- "top 20 bugs by priority" results in {"query": "bugs", "orderBy": "priority", "reverse": true, "limit": 20}

CRITICAL: Return ONLY the raw JSON object - no markdown, no code blocks, no explanations.`;
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

CRITICAL: Respond with ONLY raw JSON - no markdown code blocks, no backticks, no explanations. Just the JSON:

{
    "action": "search|create",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "priority": "urgent|high|normal|low" or null,
    "assignee": "username" or null
}`;
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