#!/usr/bin/env node

/**
 * Debug script to help find the correct ClickUp List ID
 * Run with: node debug-clickup.js
 */

require('dotenv').config();
const axios = require('axios');

class ClickUpDebugger {
    constructor() {
        this.apiToken = process.env.CLICKUP_API_TOKEN;
        this.baseURL = 'https://api.clickup.com/api/v2';

        if (!this.apiToken) {
            console.error('❌ CLICKUP_API_TOKEN not found in .env file');
            process.exit(1);
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': this.apiToken,
                'Content-Type': 'application/json'
            }
        });
    }

    async debugListAccess() {
        console.log('🔍 ClickUp List ID Debugger');
        console.log('============================\n');

        // Test the suspected List ID
        const suspectedListId = 'rf3me-17585';
        console.log(`Testing List ID: ${suspectedListId}`);

        try {
            const response = await this.client.get(`/list/${suspectedListId}`);
            console.log('✅ SUCCESS! List found:');
            console.log(`   Name: ${response.data.name}`);
            console.log(`   ID: ${response.data.id}`);
            console.log(`   Status: ${response.data.status}`);
            console.log(`   Permission Level: ${response.data.permission_level || 'Not specified'}`);
            return true;
        } catch (error) {
            console.log('❌ FAILED to access list:');
            console.log(`   Error: ${error.response?.data?.err || error.message}`);
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   Details:`, error.response?.data);
            return false;
        }
    }

    async findAllLists() {
        console.log('\n🔍 Searching for all accessible lists...\n');

        try {
            // Get teams first
            const teamsResponse = await this.client.get('/team');
            const teams = teamsResponse.data.teams;

            console.log(`Found ${teams.length} team(s):`);

            for (const team of teams) {
                console.log(`\n📁 Team: ${team.name} (ID: ${team.id})`);

                try {
                    // Get spaces
                    const spacesResponse = await this.client.get(`/team/${team.id}/space`);
                    const spaces = spacesResponse.data.spaces;

                    for (const space of spaces) {
                        console.log(`  📂 Space: ${space.name} (ID: ${space.id})`);

                        // Try to get lists directly from space
                        try {
                            const spaceListsResponse = await this.client.get(`/space/${space.id}/list`);
                            const spaceLists = spaceListsResponse.data.lists || [];

                            for (const list of spaceLists) {
                                console.log(`    📋 List: ${list.name} (ID: ${list.id}) [Direct in Space]`);
                            }
                        } catch (error) {
                            // No direct lists in space
                        }

                        // Get folders
                        try {
                            const foldersResponse = await this.client.get(`/space/${space.id}/folder`);
                            const folders = foldersResponse.data.folders || [];

                            for (const folder of folders) {
                                console.log(`    📁 Folder: ${folder.name} (ID: ${folder.id})`);

                                try {
                                    const listsResponse = await this.client.get(`/folder/${folder.id}/list`);
                                    const lists = listsResponse.data.lists || [];

                                    for (const list of lists) {
                                        console.log(`      📋 List: ${list.name} (ID: ${list.id})`);
                                    }
                                } catch (error) {
                                    console.log(`      ❌ Could not access lists in folder: ${error.response?.data?.err}`);
                                }
                            }
                        } catch (error) {
                            console.log(`    ❌ Could not access folders: ${error.response?.data?.err}`);
                        }
                    }
                } catch (error) {
                    console.log(`  ❌ Could not access spaces: ${error.response?.data?.err}`);
                }
            }
        } catch (error) {
            console.log(`❌ Could not access teams: ${error.response?.data?.err || error.message}`);
        }
    }

    async testUrlExtraction() {
        console.log('\n🔗 Testing URL extraction...\n');

        const testUrl = 'https://app.clickup.com/25661070/v/l/rf3me-17585?pr=90080284723';
        const match = testUrl.match(/\/v\/l\/([^/?]+)/);
        const extractedId = match ? match[1] : null;

        console.log(`URL: ${testUrl}`);
        console.log(`Extracted ID: ${extractedId}`);

        if (extractedId) {
            console.log('\n🧪 Testing extracted ID...');
            try {
                const response = await this.client.get(`/list/${extractedId}`);
                console.log('✅ Extracted ID works!');
                console.log(`   List Name: ${response.data.name}`);
            } catch (error) {
                console.log('❌ Extracted ID failed:');
                console.log(`   Error: ${error.response?.data?.err || error.message}`);
            }
        }
    }

    async run() {
        await this.debugListAccess();
        await this.testUrlExtraction();
        await this.findAllLists();

        console.log('\n💡 Recommendations:');
        console.log('1. Check if the List ID from your URL matches any found above');
        console.log('2. Verify you have permission to create tasks in the target list');
        console.log('3. Try using a different list ID if available');
        console.log('4. Contact your ClickUp admin if you need access permissions');
    }
}

// Run the debugger
const mainApp = new ClickUpDebugger();
mainApp.run().catch(console.error);