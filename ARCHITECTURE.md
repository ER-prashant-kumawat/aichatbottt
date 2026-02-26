# 🤖 AI AGENT - COMPLETE ARCHITECTURE

## Overview
**Professional AI Agent with Convex Database** - Multi-feature intelligent assistant.

---

## 📁 PROJECT STRUCTURE

```
ai-agent-convex/
├── convex/                    # Backend (Convex Server)
│   ├── schema.ts             # Database structure
│   ├── agent.ts              # AI Agent (Main logic)
│   ├── chat.ts               # Chat actions
│   ├── users.ts              # User management
│   ├── threads.ts            # Chat threads
│   ├── messages.ts           # Message storage
│   ├── documents.ts          # Document management (RAG)
│   ├── tracking.ts           # Usage tracking
│   └── convex.config.ts      # Convex config
│
├── src/                       # Frontend (React + Vite)
│   ├── components/
│   │   ├── Chat.tsx          # Chat UI
│   │   └── UserSetup.tsx     # Login form
│   ├── App.tsx               # Main app
│   ├── main.tsx              # Entry point
│   └── index.css             # Styling
│
├── index.html                # HTML template
├── vite.config.ts            # Vite config
├── package.json              # Dependencies
└── .env.local                # Environment variables
```

---

## 🔧 BACKEND (convex/)

### 1. **schema.ts** - Database Tables
```
Users → Threads → Messages
                → Documents (RAG)
                → UsageLog (Analytics)
```

**Tables:**
- `users` - User accounts
- `threads` - Chat conversations
- `messages` - Individual messages
- `documents` - Files for RAG
- `usageLog` - Token tracking

### 2. **agent.ts** - AI Engine
**Features:**
- ✅ Multi-step reasoning
- ✅ Tool calling (search, analyze, generate)
- ✅ RAG integration
- ✅ Context management
- ✅ Structured outputs

**Functions:**
```typescript
generateAIResponse()      // Main response generation
executeToolCall()         // Tool execution
generateStructuredResponse() // Structured outputs
streamAIResponse()        // Stream support
```

### 3. **chat.ts** - Chat Actions
**Endpoints:**
```
chat()           // Main chat with RAG
analyzeMessage() // Message analysis
getChatContext() // Get context for UI
complexChat()    // Multi-tool support
```

### 4. **Other Modules**
- `users.ts` - Create/get users
- `threads.ts` - Thread CRUD
- `messages.ts` - Message storage
- `documents.ts` - RAG documents
- `tracking.ts` - Usage analytics

---

## 🎨 FRONTEND (src/)

### 1. **App.tsx** - Main Container
- Sidebar with chat history
- Switch between threads
- User logout
- New chat button

### 2. **Chat.tsx** - Chat Interface
- Message display
- Auto-scroll
- Input form
- Real-time updates

### 3. **UserSetup.tsx** - Authentication
- Email input
- Name input
- User creation
- Local storage

---

## 🔄 DATA FLOW

```
User types message
         ↓
Frontend sends to backend (chat action)
         ↓
Agent gets chat history + documents (RAG)
         ↓
OpenAI generates response
         ↓
Save to database
         ↓
Track tokens used
         ↓
Return to frontend
         ↓
Display in UI
```

---

## 🛠️ KEY FEATURES

### 1. **RAG (Retrieval-Augmented Generation)**
- User documents stored in `documents` table
- When user types message, agent searches relevant docs
- Context added to AI prompt automatically
- More accurate, personalized responses

### 2. **Tool Support**
Tools available to AI:
```
searchDocuments()   → Find relevant documents
analyzeText()       → Analyze content
generateContent()   → Create new text
```

### 3. **Multi-turn Conversation**
- Chat history stored in `messages` table
- Indexed by thread + user
- Last 5 messages sent as context
- Full conversation history preserved

### 4. **Usage Tracking**
- Every AI call logged in `usageLog`
- Token counting (input + output)
- Per-user analytics
- Cost estimation ready

### 5. **Context Management**
- Recent messages (5 last)
- Relevant documents (RAG)
- User documents available
- System prompts customizable

---

## 🚀 EXECUTION FLOW

### When you run `npm run dev`:

1. **Backend starts** (`convex dev`)
   - Initializes local database
   - Loads schema
   - Prepares API endpoints
   - Listening on localhost:8000

2. **Frontend starts** (`vite`)
   - React app builds
   - Connects to Convex
   - Listening on localhost:5173
   - Auto-opens browser

3. **Ready to use:**
   - Enter email + name
   - Create new chat
   - Type message
   - AI responds with RAG

---

## 📡 API ENDPOINTS (Actions)

```typescript
// Chat
api.chat.chat(threadId, userId, message, useRag?)
api.chat.analyzeMessage(message, type)
api.chat.getChatContext(threadId, userId)
api.chat.complexChat(threadId, userId, message, tools)

// Users
api.users.getOrCreateUser(email, name)
api.users.getUserById(userId)

// Threads
api.threads.createThread(userId, title?)
api.threads.getThreadsByUser(userId)
api.threads.deleteThread(threadId)

// Messages
api.messages.create(threadId, userId, role, content)
api.messages.getByThread(threadId)
api.messages.getRecent(threadId, limit)

// Documents (RAG)
api.documents.addDocument(userId, title, content, category)
api.documents.search(userId, query)
api.documents.getByUser(userId)

// Tracking
api.tracking.logUsage(userId, agentName, model, tokens...)
api.tracking.getUserUsage(userId)
api.tracking.getUsageStats(userId)
```

---

## 🔐 Environment Variables

```
OPENAI_API_KEY      # Required: OpenAI API key
VITE_CONVEX_URL     # Auto-set: http://localhost:8000
```

---

## 📊 DATABASE SCHEMA OVERVIEW

```sql
users
├── _id (primary)
├── email
├── name
└── createdAt

threads
├── _id (primary)
├── userId (foreign)
├── title
├── createdAt
└── updatedAt

messages
├── _id (primary)
├── threadId (foreign)
├── userId (foreign)
├── role (user/assistant)
├── content
└── createdAt

documents
├── _id (primary)
├── userId (foreign)
├── title
├── content
├── category
└── createdAt

usageLog
├── _id (primary)
├── userId (foreign)
├── agentName
├── model
├── inputTokens
├── outputTokens
├── totalTokens
└── createdAt
```

---

## 🎯 HOW FEATURES WORK

### Feature 1: RAG (Document Search)
```
User: "What's in my documents about AI?"
         ↓
Agent searches documents table for "AI"
         ↓
Finds matching documents
         ↓
Adds to prompt: "Here are relevant documents: ..."
         ↓
OpenAI responds with document context
```

### Feature 2: Multi-turn Chat
```
User: "What is machine learning?"
  AI: "Machine learning is..."
  
User: "Give examples"
         ↓
Agent gets previous message as context
         ↓
Understands "examples of what"
         ↓
Provides relevant examples
```

### Feature 3: Tool Calling
```
User: "Analyze my documents"
         ↓
Agent calls searchDocuments tool
         ↓
Gets document list
         ↓
Analyzes content
         ↓
Returns insights
```

### Feature 4: Usage Tracking
```
Every AI call:
  - Tokens counted
  - Saved to usageLog
  - User can see analytics
  - Cost estimation ready
```

---

## 🎓 LEARNING PATH

1. **Start**: `npm run dev` → Chat works
2. **Add documents**: Upload PDFs/text
3. **Test RAG**: Ask questions about docs
4. **Check analytics**: View token usage
5. **Add custom tools**: Extend functionality
6. **Deploy**: `npm run deploy`

---

## 🚀 PRODUCTION READY FEATURES

✅ Database persistence
✅ User authentication support
✅ RAG (Retrieval-Augmented Generation)
✅ Tool support
✅ Usage tracking
✅ Error handling
✅ Real-time updates
✅ Scalable architecture

---

## 📝 NEXT STEPS

1. Add more tools
2. Implement vector search
3. Add file uploads
4. Create admin dashboard
5. Deploy to production
6. Add authentication (Clerk/Auth0)
