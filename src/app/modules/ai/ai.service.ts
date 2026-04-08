import OpenAI from "openai";
import { envVars } from "../../config/env";

// AI Service — restart triggered to reload .env (updated: keep this comment)

// Creates OpenAI client for OpenRouter on demand
function getClient() {
  const apiKey = envVars.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey.trim(),
    defaultHeaders: {
      "HTTP-Referer": envVars.FRONTEND_URL || "http://localhost:3000",
      "X-Title": "Planora", 
    }
  });
}

// ─── Feature 1: Generate Event Description ─────────────────────────────────
interface GenerateDescriptionInput {
  title: string;
  venue?: string;
  date?: string;
  type?: string;
  additionalContext?: string;
}

export const generateEventDescription = async (
  input: GenerateDescriptionInput
): Promise<string> => {
  const { title, venue, date, type, additionalContext } = input;
  const client = getClient();

  const prompt = `You are a professional event copywriter for Planora, a modern event management platform.

Write a compelling, engaging, and professional event description for the following event. 
The description should:
- Be 2-3 paragraphs long
- Capture the excitement and value of attending
- Include what attendees can expect
- Have a clear, enthusiastic tone
- NOT include the event title again at the start
- NOT include placeholder text like [Your Name] or [details TBD]

Event Details:
- Title: ${title}
- Type: ${type || "Not specified"} event
- Venue/Location: ${venue || "Not specified"}
- Date: ${date || "Not specified"}
${additionalContext ? `- Additional context: ${additionalContext}` : ""}

Write ONLY the description text, no headers, no markdown formatting, no extra commentary.`;

  const response = await client.chat.completions.create({
    model: "openrouter/free",
    messages: [
      { role: "user", content: prompt }
    ],
  });

  return response.choices[0]?.message?.content?.trim() || "";
};


// ─── Feature 2: AI Chat Assistant ──────────────────────────────────────────
interface ChatMessage {
  role: "user" | "model" | "assistant";
  parts?: string;  // Kept for backward compatibility with existing front-end structure if needed
  content?: string;
}

const SYSTEM_CONTEXT = `You are Plai, the friendly and knowledgeable AI assistant for Planora — a modern event management platform.

Your role is to help users with:
1. Finding and discovering events on the platform
2. Understanding how Planora works (creating events, joining events, invitations, payments, etc.)
3. Answering questions about event management best practices
4. Guiding users through dashboard features (My Events, Participations, Earnings, Settings, Invitations)
5. Helping event organizers with tips on running successful events

Key platform facts you know:
- Planora supports both Online and Offline events
- Events can be Public or Private (invite-only)
- Events can be Free or Paid (Stripe payments)
- Users can join public free events directly; paid events require Stripe payment
- Private events require an invitation from the organizer
- Organizers can track earnings, manage participants, and send invitations from their dashboard
- The platform has dark and light mode support

Keep your responses:
- Concise and friendly (2-4 sentences max unless more detail is needed)
- Helpful and action-oriented
- On-topic (Planora and events only)
- If asked something completely unrelated to events or Planora, politely redirect

Do NOT:
- Pretend to have real-time data about specific events
- Make up event listings
- Answer questions about other platforms unless comparing

Your name is "Plai" and you are Planora's AI assistant.`;

export const chatWithAssistant = async (
  messages: ChatMessage[],
  userMessage: string
): Promise<string> => {
  const client = getClient();

  const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: SYSTEM_CONTEXT,
    },
    {
      role: "assistant",
      content: "Understood! I'm Plai, Planora's AI assistant. I'm ready to help users discover events, navigate the platform, and get the most out of their event experiences. What can I help you with?",
    },
    ...messages.map((msg) => ({
      role: (msg.role === "model" ? "assistant" : msg.role) as "user" | "assistant",
      content: msg.parts || msg.content || "",
    })),
    {
      role: "user",
      content: userMessage,
    }
  ];

  const response = await client.chat.completions.create({
    model: "openrouter/free",
    messages: formattedMessages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || "";
};
