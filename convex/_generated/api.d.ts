/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLog from "../activityLog.js";
import type * as agent from "../agent.js";
import type * as chat from "../chat.js";
import type * as creative from "../creative.js";
import type * as documents from "../documents.js";
import type * as files from "../files.js";
import type * as humanizer from "../humanizer.js";
import type * as messages from "../messages.js";
import type * as papers from "../papers.js";
import type * as pdfGenerator from "../pdfGenerator.js";
import type * as research from "../research.js";
import type * as threads from "../threads.js";
import type * as tracking from "../tracking.js";
import type * as usageLog from "../usageLog.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLog: typeof activityLog;
  agent: typeof agent;
  chat: typeof chat;
  creative: typeof creative;
  documents: typeof documents;
  files: typeof files;
  humanizer: typeof humanizer;
  messages: typeof messages;
  papers: typeof papers;
  pdfGenerator: typeof pdfGenerator;
  research: typeof research;
  threads: typeof threads;
  tracking: typeof tracking;
  usageLog: typeof usageLog;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
