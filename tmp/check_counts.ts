import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count({
    where: {
      role: 'USER',
    },
  });
  console.log('Total USERs:', users);

  const events = await prisma.event.findMany({
    take: 1,
  });
  
  if (events.length > 0) {
    const eventId = events[0].id;
    console.log('Testing with eventId:', eventId);
    
    const participants = await prisma.participant.count({
      where: { eventId },
    });
    console.log('Participants for this event:', participants);
    
    const invitations = await prisma.invitation.count({
      where: { eventId, status: { in: ['PENDING', 'ACCEPTED'] } },
    });
    console.log('Pending/Accepted invitations for this event:', invitations);
  } else {
    console.log('No events found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
