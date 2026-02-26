<<<<<<< HEAD
# chatbot
=======
# AI Agent with Convex Database

Complete AI Agent setup using Convex and OpenAI.

## Features

✅ **Agent Component**: Built-in LLM agent with tool support  
✅ **Database Integration**: Full Convex database with schema  
✅ **Chat System**: Thread-based messaging with history  
✅ **Document Management**: Store and search user documents (RAG)  
✅ **Usage Tracking**: Token usage monitoring and analytics  
✅ **User Management**: Multi-user support  

## Project Structure

```
convex/
├── schema.ts          # Database schema (users, threads, messages, documents)
├── agent.ts          # AI Agent definition with tools
├── users.ts          # User management functions
├── threads.ts        # Chat thread management
├── messages.ts       # Message storage & retrieval
├── documents.ts      # Document management for RAG
├── chat.ts           # Chat actions (send, stream)
├── tracking.ts       # Usage tracking & analytics
└── convex.config.ts  # Convex config with agent component
```

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Initialize Convex**:
```bash
npx convex init
```

3. **Add OpenAI API key to environment**:
Create `.env.local` and add:
```
OPENAI_API_KEY=your_key_here
```

4. **Deploy schema**:
```bash
npm run dev
```

## Database Schema

### Users
- Store user accounts with email & name

### Threads
- Chat threads for conversations
- Indexed by user ID

### Messages
- Individual messages in threads
- Supports user/assistant roles
- Indexed by thread & user

### Documents
- User documents for RAG
- Full-text searchable
- Categorized by topic

### UsageLog
- Track token consumption
- Per-user analytics
- Models & agents tracked

## API Functions

### Users
- `getOrCreateUser(email, name)` - Create or get user
- `getUserById(userId)` - Get user info
- `getUserByEmail(email)` - Find user by email

### Threads
- `createThread(userId, title?)` - New chat thread
- `getThreadsByUser(userId)` - List user threads
- `getThread(threadId)` - Get single thread
- `updateThreadTitle(threadId, title)` - Rename thread
- `deleteThread(threadId)` - Delete thread

### Messages
- `create(threadId, userId, role, content)` - Save message
- `getByThread(threadId)` - Get all messages in thread
- `getRecent(threadId, limit)` - Last N messages
- `deleteMessage(messageId)` - Remove message

### Documents
- `addDocument(userId, title, content, category)` - Add doc
- `search(userId, query)` - Search user documents
- `getByUser(userId)` - List user documents
- `getByCategory(userId, category)` - Filter by category
- `deleteDocument(documentId)` - Delete doc

### Chat
- `sendMessage(threadId, userId, userMessage)` - Send & get response
- `streamMessage(threadId, userId, userMessage)` - Stream response
- `getChatContext(threadId, userId)` - Get chat context

### Tracking
- `logUsage(...)` - Log token usage
- `getUserUsage(userId)` - Get usage summary
- `getUsageStats(userId)` - Detailed usage breakdown

## AI Agent Features

### Built-in Tools
1. **searchDocuments** - Search user documents for context (RAG)
2. **saveMessageTool** - Save responses to database

### Agent Capabilities
- Multi-step reasoning (maxSteps: 5)
- Vector embeddings for semantic search
- Automatic usage tracking
- Tool call results in message history

## Example Usage

### 1. Create User
```javascript
const user = await mutation(api.users.getOrCreateUser, {
  email: "user@example.com",
  name: "John Doe"
});
```

### 2. Create Thread
```javascript
const threadId = await mutation(api.threads.createThread, {
  userId: user._id,
  title: "Project Discussion"
});
```

### 3. Add Document
```javascript
await mutation(api.documents.addDocument, {
  userId: user._id,
  title: "Project Spec",
  content: "Detailed project specifications...",
  category: "docs"
});
```

### 4. Send Message
```javascript
const response = await action(api.chat.sendMessage, {
  threadId,
  userId: user._id,
  userMessage: "What is the project about?"
});
// AI will search documents and respond
```

### 5. Track Usage
```javascript
const usage = await query(api.tracking.getUserUsage, {
  userId: user._id
});
console.log(usage.totalTokens); // Total tokens used
```

## Deployment

```bash
npm run build
npm run deploy
```

## Next Steps

- Add authentication (Clerk, Auth0, etc.)
- Build React frontend with useQuery/useMutation hooks
- Add more LLM models
- Implement vector database for better search
- Add streaming UI components
- Create admin dashboard for usage analytics

## Environment Variables

```
OPENAI_API_KEY        # Required for LLM calls
VITE_CONVEX_URL       # Optional for frontend
```

## Troubleshooting

**Type errors on components.agent?**
Run `npm run dev` to generate types first

**Messages not saving?**
Check user ID is valid and database permissions

**Agent not finding documents?**
Ensure documents are added with same userId making the query
>>>>>>> ad8bc47 (Initial commit)
