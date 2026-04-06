import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ===========================
// PASSWORD HASHING (SHA-256)
// ===========================
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "__SECURE_SALT_PRASHANT__");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ===========================
// HELPER: Verify user exists
// ===========================
async function verifyUser(ctx: any, userId: any) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Unauthorized: User not found");
  }
  return user;
}

// ===========================
// SIGNUP - One email, one time only
// ===========================
export const signup = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, name, password }) => {
    // Validate inputs
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedName || !password) {
      throw new Error("All fields are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error("Invalid email format");
    }

    // CHECK: Email already registered?
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();

    if (existing) {
      // Old user without password - let them set password via signup
      if (!existing.passwordHash) {
        const hash = await hashPassword(password);
        await ctx.db.patch(existing._id, {
          passwordHash: hash,
          name: trimmedName,
        });
        console.log(`🔒 Password set for legacy user via signup: ${trimmedEmail}`);
        return {
          _id: existing._id,
          email: existing.email,
          name: trimmedName,
          createdAt: existing.createdAt,
        };
      }
      throw new Error("ALREADY_REGISTERED");
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = await ctx.db.insert("users", {
      email: trimmedEmail,
      name: trimmedName,
      passwordHash,
      createdAt: Date.now(),
    });

    console.log(`✅ New user registered: ${trimmedEmail}`);

    return {
      _id: userId,
      email: trimmedEmail,
      name: trimmedName,
      createdAt: Date.now(),
    };
  },
});

// ===========================
// LOGIN - Email + Password verification
// ===========================
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      throw new Error("Email and password are required");
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();

    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    // Old user without password - set password on first login
    if (!user.passwordHash) {
      const newHash = await hashPassword(password);
      await ctx.db.patch(user._id, { passwordHash: newHash });
      console.log(`🔒 Password set for legacy user: ${trimmedEmail}`);
      return {
        _id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      };
    }

    // Verify password
    const passwordHash = await hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("INVALID_CREDENTIALS");
    }

    console.log(`✅ User logged in: ${trimmedEmail}`);

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  },
});

// ===========================
// CHECK EMAIL EXISTS (for frontend)
// ===========================
export const checkEmailExists = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const trimmedEmail = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();
    return !!user;
  },
});

// ===========================
// GET USER BY ID (secure - only returns safe data)
// ===========================
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    // Never return passwordHash
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  },
});

// ===========================
// GET USER BY EMAIL (secure)
// ===========================
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  },
});

// ===========================
// UPDATE USER (ownership verified)
// ===========================
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    callerUserId: v.id("users"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { userId, callerUserId, name }) => {
    // Ownership check
    if (userId !== callerUserId) {
      throw new Error("Unauthorized: Cannot update another user's profile");
    }

    await verifyUser(ctx, userId);

    const updateData: any = {};
    if (name && name.trim()) updateData.name = name.trim();

    if (Object.keys(updateData).length > 0) {
      await ctx.db.patch(userId, updateData);
    }
  },
});

// ===========================
// CHANGE PASSWORD (secure)
// ===========================
export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    oldPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { userId, oldPassword, newPassword }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Verify old password
    const oldHash = await hashPassword(oldPassword);
    if (user.passwordHash !== oldHash) {
      throw new Error("Current password is incorrect");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    const newHash = await hashPassword(newPassword);
    await ctx.db.patch(userId, { passwordHash: newHash });
  },
});

// ===========================
// DELETE USER (ownership verified + password required)
// ===========================
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    callerUserId: v.id("users"),
    password: v.string(),
  },
  handler: async (ctx, { userId, callerUserId, password }) => {
    // Ownership check
    if (userId !== callerUserId) {
      throw new Error("Unauthorized: Cannot delete another user's account");
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Verify password before deletion
    const passwordHash = await hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("Incorrect password");
    }

    // Delete ALL user data from every table

    // 1. Delete messages & threads
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const thread of threads) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const msg of messages) await ctx.db.delete(msg._id);
      await ctx.db.delete(thread._id);
    }

    // 2. Delete creations
    const creations = await ctx.db
      .query("creations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const c of creations) await ctx.db.delete(c._id);

    // 3. Delete research history
    const research = await ctx.db
      .query("research")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const r of research) await ctx.db.delete(r._id);

    // 4. Delete papers
    const papers = await ctx.db
      .query("papers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const p of papers) await ctx.db.delete(p._id);

    // 5. Delete humanized texts
    const humanized = await ctx.db
      .query("humanizedTexts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const h of humanized) await ctx.db.delete(h._id);

    // 6. Delete documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const d of documents) await ctx.db.delete(d._id);

    // 7. Delete PDF documents
    const pdfDocs = await ctx.db
      .query("pdfDocuments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const p of pdfDocs) await ctx.db.delete(p._id);

    // 8. Delete research notes
    const notes = await ctx.db
      .query("researchNotes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const n of notes) await ctx.db.delete(n._id);

    // 9. Delete usage logs
    const usageLogs = await ctx.db
      .query("usageLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const u of usageLogs) await ctx.db.delete(u._id);

    // 10. Delete activity logs
    const activityLogs = await ctx.db
      .query("activityLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const a of activityLogs) await ctx.db.delete(a._id);

    // 11. Delete files (storage + metadata)
    const files = await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const f of files) {
      try {
        await ctx.storage.delete(f.storageId as any);
      } catch {
        // Continue if storage delete fails
      }
      await ctx.db.delete(f._id);
    }

    // 12. Finally delete user
    await ctx.db.delete(userId);
    console.log(`✅ User ${userId} and ALL data deleted (${threads.length} threads, ${creations.length} creations, ${research.length} research, ${papers.length} papers, ${documents.length} docs, ${files.length} files)`);
  },
});

// Legacy compatibility - kept for any old references
export const getOrCreateUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { email }) => {
    const trimmedEmail = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();

    if (existing) {
      return {
        _id: existing._id,
        email: existing.email,
        name: existing.name,
        createdAt: existing.createdAt,
      };
    }

    throw new Error("Please use the signup page to create an account first.");
  },
});
