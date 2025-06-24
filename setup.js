#!/usr/bin/env node

/**
 * Setup script to help users configure their ClickUp MCP Server
 * Run with: node setup.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setup() {
    console.log('ClickUp MCP Server Setup\n');
    console.log('This script will help you configure your environment variables.\n');

    const config = {};

    // ClickUp Configuration
    console.log('ClickUp Configuration:');
    console.log('You need a Personal API Token (NOT OAuth credentials)');
    console.log('Go to: ClickUp Settings → Apps → API Token → Generate');
    console.log('The token should start with "pk_"\n');
    config.CLICKUP_API_TOKEN = await question('Enter your ClickUp Personal API token: ');
    
    console.log('\nNow you need to find where to create tickets...');
    console.log('REQUIRED: List ID - this is where your tickets will be created');
    console.log('OPTIONAL: Other IDs - only needed for advanced features\n');
    
    console.log('To find your List ID:');
    console.log('1. Go to any list in ClickUp');
    console.log('2. Look at the URL: https://app.clickup.com/12345/v/l/67890');
    console.log('3. The number after "/l/" is your List ID (67890 in this example)\n');
    
    config.CLICKUP_LIST_ID = await question('Enter your ClickUp List ID (REQUIRED): ');
    
    const needAdvanced = await question('Do you want to set optional IDs now? (y/N): ');
    if (needAdvanced.toLowerCase() === 'y' || needAdvanced.toLowerCase() === 'yes') {
        config.CLICKUP_TEAM_ID = await question('Enter your ClickUp Team ID (optional): ');
        config.CLICKUP_SPACE_ID = await question('Enter your ClickUp Space ID (optional): ');
        config.CLICKUP_FOLDER_ID = await question('Enter your ClickUp Folder ID (optional): ');
    } else {
        config.CLICKUP_TEAM_ID = '';
        config.CLICKUP_SPACE_ID = '';
        config.CLICKUP_FOLDER_ID = '';
        console.log('Skipping optional IDs - you can add them later if needed.');
    }

    // OpenRouter Configuration
    console.log('\nOpenRouter Configuration:');
    console.log('Sign up at https://openrouter.ai for free API access.');
    config.OPENROUTER_API_KEY = await question('Enter your OpenRouter API key: ');

    // Server Configuration
    console.log('\nServer Configuration:');
    const port = await question('Enter port number (default: 3000): ');
    config.PORT = port || '3000';
    config.NODE_ENV = 'development';

    // Generate .env file
    const envContent = Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    fs.writeFileSync('.env', envContent);

    console.log('\nConfiguration saved to .env file!');
    console.log('\nYou can now start the server with:');
    console.log('   npm start');
    console.log('\nFor more information, check the README.md file.');

    rl.close();
}

// Check if .env already exists
if (fs.existsSync('.env')) {
    console.log('.env file already exists!');
    question('Do you want to overwrite it? (y/N): ').then((answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            setup();
        } else {
            console.log('Setup cancelled.');
            rl.close();
        }
    });
} else {
    setup();
}