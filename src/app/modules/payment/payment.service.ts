import Stripe from "stripe";
import { envVars } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";
import { ParticipationStatus, PaymentStatus } from "../../../generated/prisma/index.js";

const stripe = new Stripe(envVars.STRIPE_SECRET_KEY);

const createCheckoutSession = async (userId: string, eventId: string, invitationId?: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  if (event.fee <= 0) {
    throw new AppError(status.BAD_REQUEST, "This event is free");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: event.title,
            description: event.description,
          },
          unit_amount: Math.round(event.fee * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${envVars.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envVars.FRONTEND_URL}/payment/cancel`,
    metadata: {
      userId,
      eventId,
      invitationId: invitationId || "none",
    },
  });

  return session;
};

const handleWebhook = async (sig: string, payload: Buffer) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    throw new AppError(status.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, eventId, invitationId } = session.metadata as any;

    if (!userId || !eventId) {
      throw new AppError(status.BAD_REQUEST, "Invalid session metadata");
    }

    try {
      // Update or create participation
      const participation = await prisma.participant.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: {
          paymentStatus: PaymentStatus.PAID,
          transactionId: session.id,
        },
        create: {
          userId,
          eventId,
          paymentStatus: PaymentStatus.PAID,
          status: ParticipationStatus.PENDING,
          transactionId: session.id,
        },
        include: { event: true }
      });

      // If this was from an invitation, mark it as ACCEPTED
      if (invitationId && invitationId !== "none") {
        await prisma.invitation.updateMany({
          where: { id: invitationId, status: { not: 'ACCEPTED' } },
          data: { status: 'ACCEPTED' }
        });
      }

      // Check if earnings already created
      const existingEarnings = await prisma.earnings.findFirst({
        where: { eventId, amount: (session.amount_total || 0) / 100, createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60) } }
      });

      if (!existingEarnings) {
        const amount = session.amount_total ? session.amount_total / 100 : 0;
        const platformFee = amount * 0.1; 
        const creatorEarn = amount - platformFee;

        await prisma.earnings.create({
          data: {
            eventId,
            creatorId: participation.event.creatorId,
            amount,
            platformFee,
            creatorEarn,
          },
        });
      }
    } catch (e: any) {
      console.error("Webhook processing error:", e);
    }
  }

  return { received: true };
};

const getMyEarnings = async (userId: string) => {
    const earnings = await prisma.earnings.findMany({
        where: { creatorId: userId },
        include: {
            event: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    const totalEarnings = await prisma.earnings.aggregate({
        where: { creatorId: userId },
        _sum: { creatorEarn: true }
    });

    return {
        earnings,
        total: totalEarnings._sum.creatorEarn || 0
    };
}

const verifyPayment = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    const { userId, eventId, invitationId } = session.metadata as any;

    if (!userId || !eventId) {
      throw new AppError(status.BAD_REQUEST, "Invalid session metadata");
    }

    try {
      // Update or create participation
      const participation = await prisma.participant.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: {
          paymentStatus: PaymentStatus.PAID,
          transactionId: session.id,
        },
        create: {
          userId,
          eventId,
          paymentStatus: PaymentStatus.PAID,
          status: ParticipationStatus.PENDING,
          transactionId: session.id,
        },
        include: { event: true }
      });

      // If this was from an invitation, mark it as ACCEPTED
      if (invitationId && invitationId !== "none") {
        await prisma.invitation.updateMany({
          where: { id: invitationId, status: { not: 'ACCEPTED' } },
          data: { status: 'ACCEPTED' }
        });
      }

      // Check if earnings already created for this session
      const existingEarnings = await prisma.earnings.findFirst({
          where: { eventId, amount: (session.amount_total || 0) / 100, createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60) } }
      });

      if (!existingEarnings) {
          const amount = session.amount_total ? session.amount_total / 100 : 0;
          const platformFee = amount * 0.1;
          const creatorEarn = amount - platformFee;

          await prisma.earnings.create({
            data: {
              eventId,
              creatorId: participation.event.creatorId,
              amount,
              platformFee,
              creatorEarn,
            },
          });
      }

      return participation;
    } catch (error: any) {
      console.error("Verification error:", error);
      throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to verify transaction in database");
    }
  }

  throw new AppError(status.BAD_REQUEST, "Payment not completed");
};

export const paymentService = {
  createCheckoutSession,
  handleWebhook,
  getMyEarnings,
  verifyPayment
};
