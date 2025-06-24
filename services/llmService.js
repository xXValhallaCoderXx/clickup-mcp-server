const axios = require('axios');

class LLMService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
        
        // Using free models from OpenRouter
        this.model = 'microsoft/phi-3-mini-128k-instruct:free'; // Free model
        
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
        return `
Please analyze the following issue description and extract structured information to create a ticket. 
Return ONLY a JSON object with the following structure:

{
    "title": "Clear, concise title for the ticket",
    "description": "Detailed description with any technical details, steps to reproduce, etc.",
    "type": "bug|feature|task|improvement",
    "priority": "urgent|high|normal|low",
    "tags": ["tag1", "tag2"],
    "estimatedHours": number or null,
    "acceptanceCriteria": ["criteria1", "criteria2"] or null
}

Issue Description:
${description}

Remember to respond with ONLY the JSON object, no additional text.`;
    }

    createFallbackStructure(description) {
        // Simple fallback when LLM is not available
        const words = description.toLowerCase();
        
        let type = 'task';
        if (words.includes('bug') || words.includes('error') || words.includes('issue') || words.includes('problem')) {
            type = 'bug';
        } else if (words.includes('feature') || words.includes('add') || words.includes('new')) {
            type = 'feature';
        } else if (words.includes('improve') || words.includes('enhance') || words.includes('optimize')) {
            type = 'improvement';
        }

        let priority = 'normal';
        if (words.includes('urgent') || words.includes('critical') || words.includes('asap')) {
            priority = 'urgent';
        } else if (words.includes('high') || words.includes('important')) {
            priority = 'high';
        } else if (words.includes('low') || words.includes('minor')) {
            priority = 'low';
        }

        return {
            title: description.split('\n')[0].substring(0, 100) || 'New Ticket',
            description: description,
            type: type,
            priority: priority,
            tags: [type],
            estimatedHours: null,
            acceptanceCriteria: null
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