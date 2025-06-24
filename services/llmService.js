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