#!/usr/bin/env node

/**
 * Test script to verify API connections and functionality
 * Run with: node test-api.js
 */

require('dotenv').config();
const axios = require('axios');

class APITester {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.results = [];
    }

    async runTests() {
        console.log('🧪 Running API Tests...\n');

        await this.testServerHealth();
        await this.testClickUpConnection();
        await this.testTicketCreation();

        this.printResults();
    }

    async testServerHealth() {
        console.log('1. Testing server health...');
        try {
            const response = await axios.get(`${this.baseURL}/api/health`);
            if (response.status === 200) {
                this.logSuccess('Server is running');
            } else {
                this.logError('Server health check failed');
            }
        } catch (error) {
            this.logError('Server is not running. Start it with: npm start');
        }
    }

    async testClickUpConnection() {
        console.log('2. Testing ClickUp connection...');
        try {
            const response = await axios.get(`${this.baseURL}/api/test-clickup`);
            if (response.data.success) {
                this.logSuccess('ClickUp connection successful');
                console.log(`   Found ${response.data.teams?.length || 0} teams`);
            } else {
                this.logError(`ClickUp connection failed: ${response.data.error}`);
            }
        } catch (error) {
            this.logError(`ClickUp test failed: ${error.response?.data?.error || error.message}`);
        }
    }

    async testTicketCreation() {
        console.log('3. Testing ticket creation...');
        
        const testTicket = {
            description: 'Test ticket created by API test script. This is a bug report for testing purposes.',
            priority: 'normal'
        };

        try {
            const response = await axios.post(`${this.baseURL}/api/create-ticket`, testTicket, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.success) {
                this.logSuccess('Ticket creation successful');
                console.log(`   Ticket: ${response.data.processed.title}`);
                console.log(`   Type: ${response.data.processed.type}`);
                console.log(`   Priority: ${response.data.processed.priority}`);
            } else {
                this.logError(`Ticket creation failed: ${response.data.error}`);
            }
        } catch (error) {
            this.logError(`Ticket creation test failed: ${error.response?.data?.error || error.message}`);
        }
    }

    logSuccess(message) {
        console.log(`   ✅ ${message}`);
        this.results.push({ type: 'success', message });
    }

    logError(message) {
        console.log(`   ❌ ${message}`);
        this.results.push({ type: 'error', message });
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        
        const successes = this.results.filter(r => r.type === 'success').length;
        const errors = this.results.filter(r => r.type === 'error').length;
        
        console.log(`✅ Passed: ${successes}`);
        console.log(`❌ Failed: ${errors}`);
        
        if (errors > 0) {
            console.log('\n🔧 Troubleshooting:');
            console.log('- Check your .env file configuration');
            console.log('- Verify ClickUp API token and permissions');
            console.log('- Ensure OpenRouter API key is valid');
            console.log('- Check server logs for detailed error messages');
        } else {
            console.log('\n🎉 All tests passed! Your ClickUp MCP Server is ready to use.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new APITester();
    tester.runTests().catch(console.error);
}

module.exports = APITester;