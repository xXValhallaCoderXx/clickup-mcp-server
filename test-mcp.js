#!/usr/bin/env node

/**
 * Simple test script for the MCP endpoint
 * Run with: node test-mcp.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMCPEndpoint() {
    console.log('🤖 Testing ClickUp MCP Endpoint\n');

    // Test cases
    const testCases = [
        {
            name: 'Search Intent',
            prompt: 'find bugs assigned to john',
            expectedAction: 'search'
        },
        {
            name: 'Create Intent',
            prompt: 'the login button is broken and needs to be fixed',
            expectedAction: 'create'
        },
        {
            name: 'Explicit Search',
            prompt: 'search for high priority tasks created last week',
            expectedAction: 'search'
        },
        {
            name: 'Explicit Create',
            prompt: 'create a ticket for implementing dark mode',
            expectedAction: 'create'
        }
    ];

    console.log('Testing intent detection (without actual API calls)...\n');

    for (const testCase of testCases) {
        try {
            console.log(`📝 Test: ${testCase.name}`);
            console.log(`   Prompt: "${testCase.prompt}"`);
            
            // This will fail if server isn't running, but that's expected
            // The test is mainly to show the endpoint structure
            const response = await axios.post(`${BASE_URL}/mcp`, {
                prompt: testCase.prompt,
                teamId: null
            }, {
                timeout: 5000
            });

            console.log(`   ✅ Response: ${response.data.action} (expected: ${testCase.expectedAction})`);
            console.log(`   📊 Result: ${response.data.success ? 'Success' : 'Failed'}\n`);
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log(`   ⚠️  Server not running (expected for testing)`);
                console.log(`   📝 Would test intent: ${testCase.expectedAction}\n`);
            } else if (error.response) {
                console.log(`   ❌ Error: ${error.response.data.error}`);
                console.log(`   📝 Expected intent: ${testCase.expectedAction}\n`);
            } else {
                console.log(`   ❌ Network error: ${error.message}\n`);
            }
        }
    }

    console.log('🎯 MCP Endpoint Test Summary:');
    console.log('   • POST /mcp - Unified endpoint for search and create');
    console.log('   • AI determines intent from natural language');
    console.log('   • Automatically routes to appropriate functionality');
    console.log('   • Single endpoint for all ticket operations\n');

    console.log('🚀 To test with a running server:');
    console.log('   1. Set up your .env file with ClickUp credentials');
    console.log('   2. Run: npm start');
    console.log('   3. Visit: http://localhost:3000/mcp');
    console.log('   4. Or use the API directly with POST requests');
}

// Run the test
testMCPEndpoint().catch(console.error);