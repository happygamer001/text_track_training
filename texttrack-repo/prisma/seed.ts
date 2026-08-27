import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const track = await db.track.upsert({
    where: { id: "seed-construction" },
    update: {},
    create: { id: "seed-construction", name: "Construction — Foreman Curriculum" },
  });

  const employee = await db.employee.upsert({
    where: { phone: "+13085550142" },
    update: {},
    create: {
      firstName: "Jordan",
      lastName: "Ramirez",
      phone: "+13085550142",
      trackId: track.id,
      status: "PRE_ENROLLED",
    },
  });

  const admin = await db.admin.upsert({
    where: { email: "admin@chipperfield.ag" },
    update: {},
    create: {
      name: "Sample Admin",
      email: "admin@chipperfield.ag",
      passwordHash: "replace-me", // never a real password — seed data only
      role: "SUPER_ADMIN",
    },
  });

  const topic = await db.topic.upsert({
    where: { id: "seed-topic-1" },
    update: {},
    create: {
      id: "seed-topic-1",
      trackId: track.id,
      weekNumber: 1,
      category: "Work Ethic & Attitude",
      title: "What Gets You Noticed (For the Right Reasons)",
      smsBody: "What gets you noticed at work? It's not being the loudest...",
      deliveryFormat: "Text",
      videoFormat: "From the Boss",
    },
  });

  await db.contentAsset.upsert({
    where: { id: "seed-asset-1" },
    update: {},
    create: {
      id: "seed-asset-1",
      topicId: topic.id,
      type: "video",
      url: "https://iframe.mediadelivery.net/embed/000/sample-video-id",
      fileName: "week-1-what-gets-you-noticed.mp4",
      uploadedById: admin.id,
      isCurrent: true,
    },
  });

  console.log("Seeded track:", track.id);
  console.log("Seeded employee:", employee.id);
  console.log("Seeded admin:", admin.id);
  console.log(`Try the enrollment flow at: /enroll/confirm?id=${employee.id}`);
  console.log(`Try the courses page at: /courses?id=${employee.id}`);
  console.log(`Try the content manager at: /content?adminId=${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
