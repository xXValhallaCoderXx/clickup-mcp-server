# 📋 Step-by-Step Setup Guide

## 🔑 Getting Your ClickUp Personal API Token

### Step 1: Access ClickUp Settings
1. Log into your ClickUp account
2. Click your **profile picture** in the top-right corner
3. Select **"Settings"** from the dropdown

**OR** go directly to: `https://app.clickup.com/settings/apps`

### Step 2: Generate API Token
1. In the left sidebar, click **"Apps"**
2. Scroll down to find the **"API Token"** section
3. Click **"Generate"** (or "Create Token" if you see that)
4. **Copy the token** - it will start with `pk_`

⚠️ **Important**: This is a **Personal API Token**, not OAuth credentials!

### Step 3: Find Your List ID (Required)
You need at least one List ID where tickets will be created.

**Method A - From ClickUp URL:**
1. Go to any list in ClickUp
2. Look at the browser URL
3. It will look like: `https://app.clickup.com/12345678/v/l/90123456`
4. The number after `/l/` is your List ID (`90123456` in this example)

**Method B - Use our app (after setup):**
1. Complete the setup first
2. Start the server: `npm start`
3. Visit: `http://localhost:3000/api/clickup/structure`
4. This shows all your teams, spaces, folders, and lists with their IDs

## 🤖 Getting OpenRouter API Key (Free!)

### Step 1: Sign Up
1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Click **"Sign Up"** 
3. Create your account (it's free!)

### Step 2: Get API Key
1. Go to your dashboard
2. Click **"API Keys"** or **"Keys"**
3. Click **"Create Key"**
4. Copy the key - it will start with `sk-or-`

### Step 3: Free Credits
- You get free credits to start
- Free models available (like `microsoft/phi-3-mini-128k-instruct:free`)
- Perfect for testing and light usage

## ⚙️ Environment Configuration

Create a `.env` file in your project root:

```env
# ClickUp Configuration
CLICKUP_API_TOKEN=pk_your_actual_token_here
CLICKUP_LIST_ID=your_list_id_here

# Optional ClickUp IDs (can be found later)
CLICKUP_TEAM_ID=
CLICKUP_SPACE_ID=
CLICKUP_FOLDER_ID=

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-your_actual_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Run interactive setup (optional)
npm run setup

# 3. Start the server
npm start

# 4. Test everything works
npm test
```

## 🔍 Troubleshooting

### "Invalid API Token"
- Make sure you copied the **Personal API Token** (starts with `pk_`)
- NOT the OAuth client secret
- Token should be from Settings → Apps → API Token

### "List not found"
- Make sure the List ID is correct
- You need permission to create tasks in that list
- Try using our structure endpoint to find valid list IDs

### "OpenRouter quota exceeded"
- You've used up free credits
- The app will fall back to basic processing
- Consider upgrading or using a different model

## 📞 Need Help?

1. **Check server logs** for detailed error messages
2. **Use the test connection** feature in the web app
3. **Visit the structure endpoint** to explore your ClickUp workspace
4. **Check the troubleshooting section** in README.md

---

**You're ready to create tickets! 🎫✨**