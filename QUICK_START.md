# 🚀 Quick Start - Just 2 Things You Need!

## 🎯 The Simple Truth

You only need **2 things** to get started:

### 1. ClickUp Personal API Token
- Go to: `https://app.clickup.com/settings/apps`
- Click "Generate" in the API Token section
- Copy the token (starts with `pk_`)

### 2. ClickUp List ID  
- Go to any list in ClickUp where you want tickets created
- Look at the URL: `https://app.clickup.com/12345/v/l/67890`
- The number after `/l/` is your List ID (`67890`)

## 🤔 What About Space ID and Folder ID?

**You DON'T need them!** Here's why:

### Space ID & Folder ID are OPTIONAL
- **Space**: Just a container (like "Marketing" or "Development")
- **Folder**: Optional sub-container (many lists don't use folders)
- **List**: Where your actual tickets live (THIS is what you need!)

### When You Might Want Them Later:
- Browsing your full workspace structure
- Creating tickets in multiple lists
- Advanced automation features

## 🏗️ ClickUp Structure (Visual)

```
Your Workspace
├── 📁 Marketing Space (ID: 123)
│   ├── 📂 Q1 Campaigns Folder (ID: 456)
│   │   └── 📋 Social Media List (ID: 789) ← YOU NEED THIS ID
│   └── 📋 General Tasks List (ID: 101) ← OR THIS ID
└── 📁 Development Space (ID: 234)
    └── 📋 Bug Reports List (ID: 567) ← OR THIS ID
```

## ⚡ Super Quick Setup

1. **Get your API token** (from ClickUp settings)
2. **Get your List ID** (from any ClickUp list URL)
3. **Run setup**:
   ```bash
   npm install
   npm run setup
   ```
4. **Start creating tickets**:
   ```bash
   npm start
   ```

## 🔍 Finding Your List ID - 3 Ways

### Method 1: From URL (Easiest)
1. Go to any list in ClickUp
2. Look at browser URL
3. Copy the number after `/l/`

### Method 2: Use Our App
1. Complete setup with just API token
2. Start server: `npm start`
3. Visit: `http://localhost:3000/api/clickup/structure`
4. Browse all your lists and their IDs

### Method 3: ClickUp API
```bash
# After getting your API token
curl -H "Authorization: YOUR_TOKEN" https://api.clickup.com/api/v2/team
```

## 🎯 Minimal .env File

This is all you need to start:

```env
# Required
CLICKUP_API_TOKEN=pk_your_token_here
CLICKUP_LIST_ID=your_list_id_here

# Optional (for OpenRouter AI)
OPENROUTER_API_KEY=sk-or-your_key_here

# Server
PORT=3000
```

## ✅ You're Ready!

With just these 2 IDs, you can:
- ✅ Create tickets from descriptions
- ✅ Use AI to structure your tickets
- ✅ Set priorities and assignees
- ✅ Apply smart templates

The other IDs are just nice-to-have for advanced features!

---

**Start simple, expand later! 🎫✨**