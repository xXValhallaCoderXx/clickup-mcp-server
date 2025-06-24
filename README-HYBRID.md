# 🔄 Hybrid ClickUp Ticket Creator (Local Setup)

A powerful hybrid system combining a custom web interface with N8N workflow automation, running entirely locally on your machine.

## 🏗️ Architecture

```
Custom Web App (Port 3000)
├── Rich Context Management
├── Professional UI
└── Webhook to N8N

N8N Workflow Engine (Port 5678)
├── Visual Workflow Editor
├── AI Processing Logic
└── ClickUp Integration
```

## 🚀 Quick Start

### 1. Prerequisites
- Docker and Docker Compose installed
- ClickUp API token
- OpenRouter API key (free tier available)

### 2. Setup
```bash
# Clone/download the project
git clone <your-repo>
cd clickup-ticket-creator

# Start the local environment
./start-local.sh
```

### 3. Configuration
1. **Edit .env file** with your credentials:
   ```env
   CLICKUP_API_TOKEN=pk_your_token
   CLICKUP_LIST_ID=your_list_id
   OPENROUTER_API_KEY=sk-or-your_key
   ```

2. **Import N8N Workflow**:
   - Open http://localhost:5678
   - Go to Workflows → Import
   - Upload `n8n-workflows/ticket-creation-workflow.json`

3. **Configure Company Context**:
   - Open http://localhost:3000
   - Click "Manage Context"
   - Add your company, tech stack, and project details

## 🎯 Usage

### Creating Tickets
1. **Open the Web App**: http://localhost:3000
2. **Describe your issue** in natural language
3. **Choose processing method**:
   - ✅ **N8N Workflow** (recommended) - Visual, flexible
   - ⚪ **Direct Processing** - Fallback method
4. **Click "Create Ticket"** - Done!

### Managing Workflows
1. **Open N8N**: http://localhost:5678
2. **Edit the workflow** visually
3. **Test with sample data**
4. **Deploy changes** instantly

## 🔧 Key Features

### ✅ **Best of Both Worlds**
- **Rich Context Management** - Markdown editor for company details
- **Visual Workflow Design** - Drag-and-drop N8N interface
- **Professional UI** - Custom-designed web interface
- **Local Control** - No cloud dependencies, runs when you need it

### 🎨 **Context-Aware Tickets**
Your company context automatically enhances every ticket:
```markdown
## Technical Notes
- Update React LoginButton component
- Check JWT validation in auth.service.js
- Test with our Cypress E2E suite
- Verify mobile responsive behavior

## Affected Components
- Frontend: LoginButton.tsx, AuthContext
- Backend: auth.routes.js, user.model.js
```

### 🔄 **Flexible Processing**
- **N8N Mode**: Visual workflows, easy to modify
- **Direct Mode**: Fallback processing, always works
- **Automatic Fallback**: Switches modes if N8N is unavailable

## 📁 Project Structure

```
clickup-ticket-creator/
├── 🌐 Web App (Custom UI)
│   ├── public/           # Frontend files
│   ├── services/         # Backend services
│   └── context/          # Company context storage
├── 🔄 N8N Integration
│   ├── n8n-workflows/    # Workflow definitions
│   └── docker-compose.yml # Service orchestration
└── 🛠️ Scripts
    ├── start-local.sh    # Start everything
    └── stop-local.sh     # Stop everything
```

## 🎛️ N8N Workflow Details

The included workflow handles:

1. **Webhook Trigger** - Receives data from web app
2. **Context Retrieval** - Gets your company context
3. **AI Processing** - Enhances description with context
4. **ClickUp Creation** - Creates structured ticket
5. **Response** - Returns result to web app

### Customizing the Workflow
- **Add integrations**: Slack notifications, email alerts
- **Modify AI prompts**: Adjust for your specific needs
- **Add validation**: Custom business rules
- **Branch logic**: Different flows for different ticket types

## 💡 Usage Scenarios

### 🏢 **Daily Development Work**
```bash
# Morning standup - quick ticket creation
./start-local.sh
# Create tickets for the day
# Stop when done
./stop-local.sh
```

### 🔧 **Workflow Experimentation**
```bash
# Start services
./start-local.sh
# Open N8N at localhost:5678
# Modify workflows visually
# Test immediately
```

### 📝 **Context Updates**
```bash
# Start services
./start-local.sh
# Update company context via web UI
# Context automatically used in all tickets
```

## 🔍 Troubleshooting

### Services Won't Start
```bash
# Check Docker
docker info

# Check ports
lsof -i :3000
lsof -i :5678

# View logs
docker-compose logs
```

### N8N Workflow Issues
1. **Check credentials** in N8N settings
2. **Verify webhook URL** in workflow
3. **Test each node** individually
4. **Check execution logs** in N8N

### Context Not Loading
1. **Check file permissions** on context directory
2. **Verify API endpoints** are responding
3. **Check browser console** for errors

## 🎯 Benefits of This Approach

### ✅ **For You**
- **Local Control** - No cloud dependencies
- **Rich Context** - Company-specific ticket generation
- **Professional UI** - Better than generic tools
- **On-Demand** - Start/stop when needed

### ✅ **For Your Team**
- **Visual Workflows** - Non-technical users can modify
- **Consistent Tickets** - Structured, professional format
- **Context Awareness** - Tickets fit your environment
- **Flexible Integration** - Easy to extend

## 🚀 Next Steps

1. **Start the system**: `./start-local.sh`
2. **Configure your context** with real company details
3. **Import and test the N8N workflow**
4. **Create your first context-aware ticket**
5. **Customize workflows** for your specific needs

---

**Perfect for teams who want professional ticket creation with the flexibility to customize workflows without complex deployments!** 🎫✨