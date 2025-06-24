# ClickUp MCP Server with AI-Powered Ticket Creation

An affordable, easy-to-use web application that creates structured ClickUp tickets from natural language descriptions using AI. Perfect for teams who want to streamline their ticket creation process without breaking the bank.

## 🌟 Features

- **AI-Powered Processing**: Uses free LLM models via OpenRouter to analyze issue descriptions
- **Smart Templates**: Automatically categorizes tickets (bug, feature, task, improvement)
- **Web GUI**: Clean, responsive interface for easy ticket creation
- **ClickUp Integration**: Direct integration with ClickUp API
- **Cost-Effective**: Uses free/affordable services to minimize costs
- **Template System**: Structured ticket creation with acceptance criteria
- **Real-time Status**: Connection status monitoring and health checks

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- ClickUp account and API token
- OpenRouter account (free tier available)

### Installation

1. **Clone and setup**:
```bash
git clone <your-repo>
cd clickup-mcp-server
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
```

3. **Fill in your `.env` file**:
```env
# ClickUp Configuration
CLICKUP_API_TOKEN=pk_your_clickup_token_here
CLICKUP_TEAM_ID=your_team_id
CLICKUP_SPACE_ID=your_space_id  
CLICKUP_FOLDER_ID=your_folder_id
CLICKUP_LIST_ID=your_list_id

# OpenRouter Configuration (free tier available)
OPENROUTER_API_KEY=sk-or-your_openrouter_key

# Server Configuration
PORT=3000
NODE_ENV=development
```

4. **Start the server**:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

5. **Open your browser**:
Navigate to `http://localhost:3000`

## 🔧 Configuration Guide

### Getting ClickUp Credentials

1. **Personal API Token** (NOT OAuth app credentials):
   - Log into ClickUp
   - Click your profile picture → **Settings**
   - Or go directly to: `https://app.clickup.com/settings/apps`
   - Scroll down to **"API Token"** section
   - Click **"Generate"** or **"Create Token"**
   - Copy the token (starts with `pk_`) to your `.env` file

2. **Finding Your IDs** (needed for ticket creation):
   
   **Method 1 - From URLs:**
   - Go to any list in ClickUp
   - Look at the URL: `https://app.clickup.com/{team_id}/v/l/{list_id}`
   - Copy the `list_id` (that's the main one you need)
   
   **Method 2 - Use our app:**
   - Start the server and use the "Test Connection" feature
   - Or visit: `http://localhost:3000/api/clickup/structure`
   - This will show your workspace structure with all IDs

### Getting OpenRouter API Key (Free!)

1. Sign up at [OpenRouter.ai](https://openrouter.ai)
2. Get your free API key from the dashboard
3. The app uses free models like `microsoft/phi-3-mini-128k-instruct:free`

## 💡 Usage

1. **Describe your issue**: Write a natural language description of the problem or feature
2. **Set priority**: Choose the appropriate priority level
3. **Assign (optional)**: Add an assignee if needed
4. **Create**: Click "Create Ticket" and let AI do the work!

### Example Descriptions

**Bug Report**:
```
When I click the save button on the user profile page, I get a 500 error. 
Expected: Profile should save successfully. 
Browser: Chrome 120, Windows 11.
Steps: 1. Login, 2. Go to profile, 3. Edit name, 4. Click save
```

**Feature Request**:
```
Add a dark mode toggle to the navigation bar. Users should be able to 
switch between light and dark themes and have their preference saved 
across sessions.
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Web GUI       │───▶│  Express     │───▶│  ClickUp    │
│  (Frontend)     │    │  Server      │    │   API       │
└─────────────────┘    └──────────────┘    └─────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  OpenRouter  │
                       │  (Free LLM)  │
                       └──────────────┘
```

### Components

- **Frontend**: Vanilla HTML/CSS/JS for maximum compatibility
- **Backend**: Express.js server with modular services
- **AI Processing**: OpenRouter API with free models
- **Template Engine**: Smart ticket structuring based on content type
- **ClickUp Integration**: Direct API integration for ticket creation

## 📁 Project Structure

```
clickup-mcp-server/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── .env.example          # Environment template
├── services/             # Business logic
│   ├── clickupService.js # ClickUp API integration
│   ├── llmService.js     # AI processing with OpenRouter
│   └── templateService.js# Ticket templating
└── public/               # Frontend assets
    ├── index.html        # Main web interface
    ├── styles.css        # Responsive styling
    └── script.js         # Frontend JavaScript
```

## 🔧 Customization

### Adding Custom Templates

Edit `services/templateService.js` to add new ticket types:

```javascript
const templates = {
    yourCustomType: {
        name: '[CUSTOM] {title}',
        description: 'Your custom template...',
        priority: 'normal',
        tags: ['custom', 'your-tag']
    }
};
```

### Using Different LLM Models

Modify `services/llmService.js` to use different models:

```javascript
// Free options
this.model = 'microsoft/phi-3-mini-128k-instruct:free';
this.model = 'huggingface/zephyr-7b-beta:free';

// Paid options (better quality)
this.model = 'openai/gpt-3.5-turbo';
this.model = 'anthropic/claude-3-haiku';
```

## 💰 Cost Optimization

This setup is designed to be as affordable as possible:

- **OpenRouter Free Tier**: 10-20 free requests per day
- **ClickUp**: Free plan supports up to 100MB storage
- **Hosting**: Can run on free tiers of Heroku, Railway, or Render
- **Total Monthly Cost**: $0-5 depending on usage

## 🚀 Deployment

### Deploy to Railway (Free)

1. Connect your GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically

### Deploy to Heroku

```bash
heroku create your-app-name
heroku config:set CLICKUP_API_TOKEN=your_token
heroku config:set OPENROUTER_API_KEY=your_key
# ... add other env vars
git push heroku main
```

## 🛠️ Development

### Running in Development

```bash
npm run dev  # Uses nodemon for auto-reload
```

### Testing the API

```bash
# Test server health
curl http://localhost:3000/api/health

# Test ClickUp connection
curl http://localhost:3000/api/test-clickup

# Create a ticket
curl -X POST http://localhost:3000/api/create-ticket \
  -H "Content-Type: application/json" \
  -d '{"description": "Test bug report", "priority": "high"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - feel free to use this for personal or commercial projects!

## 🆘 Troubleshooting

### Common Issues

**"ClickUp connection failed"**:
- Check your API token is valid
- Verify team/space/folder/list IDs are correct
- Ensure you have permission to create tasks in the specified list

**"LLM processing failed"**:
- Check your OpenRouter API key
- Verify you haven't exceeded free tier limits
- The app will fall back to basic processing if LLM fails

**"Server won't start"**:
- Check Node.js version (v14+)
- Verify all environment variables are set
- Check if port 3000 is already in use

### Getting Help

1. Check the browser console for errors
2. Look at server logs for detailed error messages
3. Use the "Test Connection" feature to diagnose issues
4. Verify your ClickUp permissions and API limits

## 🎯 Roadmap

- [ ] Bulk ticket creation from CSV
- [ ] Custom field mapping
- [ ] Slack/Discord integration
- [ ] Ticket templates management UI
- [ ] Analytics and reporting
- [ ] Multi-workspace support

---

**Happy ticket creating! 🎫✨**