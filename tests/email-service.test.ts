import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  email: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn()
  }
};

const fetchLatestOutlookMessagesMock = vi.fn();
const markOutlookSyncTimestampMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/integrations/outlook", () => ({
  fetchLatestOutlookMessages: fetchLatestOutlookMessagesMock,
  markOutlookSyncTimestamp: markOutlookSyncTimestampMock
}));

describe("email-service", () => {
  beforeEach(() => {
    prismaMock.email.findMany.mockReset();
    prismaMock.email.findUnique.mockReset();
    prismaMock.email.update.mockReset();
    prismaMock.email.upsert.mockReset();
    fetchLatestOutlookMessagesMock.mockReset();
    markOutlookSyncTimestampMock.mockReset();
  });

  it("liste les emails avec leurs relations et metadonnees parsees", async () => {
    prismaMock.email.findMany.mockResolvedValue([
      {
        id: "e1",
        rawMetadataJson: JSON.stringify({
          isRead: true,
          webLink: "https://outlook.example/messages/1"
        })
      }
    ]);

    const { listEmails } = await import("@/lib/services/email-service");
    const result = await listEmails({ search: "pilotage" });

    expect(prismaMock.email.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            OR: [
              { subject: { contains: "pilotage" } },
              { fromEmail: { contains: "pilotage" } },
              { snippet: { contains: "pilotage" } }
            ]
          }
        ]
      },
      include: {
        linkedProject: true,
        linkedAction: true
      },
      orderBy: [{ receivedAt: "desc" }, { updatedAt: "desc" }]
    });
    expect(result[0]).toEqual(expect.objectContaining({
      metadata: {
        isRead: true,
        webLink: "https://outlook.example/messages/1"
      }
    }));
  });

  it("met a jour le rattachement d'un email", async () => {
    prismaMock.email.update.mockResolvedValue({
      id: "e1",
      linkedProjectId: "p1",
      linkedActionId: null,
      rawMetadataJson: null
    });

    const { updateEmail } = await import("@/lib/services/email-service");
    await updateEmail("e1", {
      linkedProjectId: "p1",
      linkedActionId: ""
    });

    expect(prismaMock.email.update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: {
        linkedProjectId: "p1",
        linkedActionId: null
      },
      include: {
        linkedProject: true,
        linkedAction: true
      }
    });
  });

  it("synchronise les messages Outlook dans Prisma", async () => {
    fetchLatestOutlookMessagesMock.mockResolvedValue([
      {
        id: "msg-1",
        subject: "Point hebdo",
        receivedDateTime: "2026-03-16T08:30:00.000Z",
        bodyPreview: "Resume rapide",
        from: {
          emailAddress: {
            address: "alice@example.com",
            name: "Alice"
          }
        },
        internetMessageId: "<abc@example.com>",
        isRead: false,
        hasAttachments: true,
        webLink: "https://outlook.office.com/mail/msg-1"
      }
    ]);

    const { syncInboxEmails } = await import("@/lib/services/email-service");
    const result = await syncInboxEmails(20);

    expect(fetchLatestOutlookMessagesMock).toHaveBeenCalledWith(20);
    expect(prismaMock.email.upsert).toHaveBeenCalledWith({
      where: {
        externalMessageId: "msg-1"
      },
      update: expect.objectContaining({
        subject: "Point hebdo",
        fromEmail: "alice@example.com"
      }),
      create: expect.objectContaining({
        externalMessageId: "msg-1",
        subject: "Point hebdo",
        fromEmail: "alice@example.com"
      })
    });
    expect(markOutlookSyncTimestampMock).toHaveBeenCalled();
    expect(result).toEqual({ syncedCount: 1 });
  });
});
