import Stripe from "stripe";
import { envVars } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import status from "http-status";
import { ParticipationStatus, PaymentStatus } from "../../../generated/prisma/enums";

const stripe = new Stripe(envVars.STRIPE_SECRET_KEY);

const createCheckoutSession = async (userId: string, eventId: string) => {
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
    success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    metadata: {
      userId,
      eventId,
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
    const { userId, eventId } = session.metadata as any;

    await prisma.$transaction(async (tx) => {
      // Update or create participation
      const participation = await tx.participant.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: {
          paymentStatus: PaymentStatus.PAID,
          transactionId: session.id,
        },
        create: {
          userId,
          eventId,
          paymentStatus: PaymentStatus.PAID,
          status: ParticipationStatus.PENDING, // Still needs approval? 
          // Requirement: "Paid Public: Pay -> Pending approval", "Paid Private: Pay -> Request -> Pending"
          transactionId: session.id,
        },
        include: { event: true }
      });

      // Calculate earnings
      const amount = session.amount_total ? session.amount_total / 100 : 0;
      const platformFee = amount * 0.1; // 10% platform fee
      const creatorEarn = amount - platformFee;

      await tx.earnings.create({
        data: {
          eventId,
          creatorId: participation.event.creatorId,
          amount,
          platformFee,
          creatorEarn,
        },
      });
    });
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

export const paymentService = {
  createCheckoutSession,
  handleWebhook,
  getMyEarnings
};
