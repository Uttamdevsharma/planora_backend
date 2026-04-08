import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { generateEventDescription, chatWithAssistant } from "./ai.service";
import status from "http-status";

// POST /ai/generate-description
const generateDescription = catchAsync(async (req: Request, res: Response) => {
  const { title, venue, date, type, additionalContext } = req.body;

  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Event title is required (min 3 characters)",
    });
  }

  try {
    const description = await generateEventDescription({
      title: title.trim(),
      venue,
      date,
      type,
      additionalContext,
    });

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Description generated successfully",
      data: { description },
    });
  } catch (err: any) {
    // Surface the real Gemini API error message to the client for easier debugging
    const errorMessage =
      err?.message || "Failed to generate description via Gemini API";
    console.error("[AI] generateDescription error:", errorMessage);

    sendResponse(res, {
      httpStatusCode: status.INTERNAL_SERVER_ERROR,
      success: false,
      message: errorMessage,
    });
  }
});

// POST /ai/chat
const chat = catchAsync(async (req: Request, res: Response) => {
  const { messages, userMessage } = req.body;

  if (
    !userMessage ||
    typeof userMessage !== "string" ||
    userMessage.trim().length === 0
  ) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "userMessage is required",
    });
  }

  const history = Array.isArray(messages) ? messages : [];

  try {
    const reply = await chatWithAssistant(history, userMessage.trim());

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Chat response generated",
      data: { reply },
    });
  } catch (err: any) {
    const errorMessage =
      err?.message || "Failed to get response from Gemini API";
    console.error("[AI] chat error:", errorMessage);

    sendResponse(res, {
      httpStatusCode: status.INTERNAL_SERVER_ERROR,
      success: false,
      message: errorMessage,
    });
  }
});

export const aiController = {
  generateDescription,
  chat,
};
