import type { INestApplication } from '@nestjs/common';
import dayjs from 'dayjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GroupType } from '../../src/api/v1/group/group.constants';
import { InvitationStatus } from '../../src/api/v1/invitation/invitation.constants';
import { MembershipRole } from '../../src/api/v1/membership/membership.constants';
import { ErrorCode } from '../../src/common/exception/error-code';
import { PrismaService } from '../../src/shared/database/prisma/prisma.service';
import { createE2eApplication } from './support/e2e-application';
import { createUniqueName, createUniqueUserInput } from './support/unique-test-data';

interface Customer {
  authorization: { Authorization: string };
  email: string;
  userId: string;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing ${field}`);
  return value;
}

async function register(app: INestApplication<App>, prefix: string): Promise<Customer> {
  const input = createUniqueUserInput(prefix);
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(input)
    .expect(201);
  return {
    authorization: {
      Authorization: `Bearer ${requireString(response.body.accessToken, 'access token')}`,
    },
    email: input.email,
    userId: requireString(response.body.user?.id, 'user ID'),
  };
}

async function createGroup(
  app: INestApplication<App>,
  owner: Customer,
  type: GroupType = GroupType.SHARED,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/groups')
    .set(owner.authorization)
    .send({ type, name: createUniqueName('Invitation group') })
    .expect(201);
  return requireString(response.body.id, 'group ID');
}

function invite(app: INestApplication<App>, owner: Customer, groupId: string, email: string) {
  return request(app.getHttpServer())
    .post(`/api/v1/groups/${groupId}/invitations`)
    .set(owner.authorization)
    .send({ email });
}

async function findToken(app: INestApplication<App>, invitee: Customer, groupId: string) {
  const response = await request(app.getHttpServer())
    .get('/api/v1/invitations')
    .set(invitee.authorization)
    .expect(200);
  const invitation = response.body.find((item: { groupId?: unknown }) => item.groupId === groupId);
  return requireString(invitation?.token, 'invitation token');
}

describe('Shared-group invitations over real HTTP and PostgreSQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createE2eApplication();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces owner-only shared-group creation rules and normalized active uniqueness', async () => {
    const owner = await register(app, 'invite-owner');
    const target = await register(app, 'invite-target');
    const member = await register(app, 'invite-member');
    const admin = await register(app, 'invite-admin');
    const outsider = await register(app, 'invite-outsider');
    const sharedGroupId = await createGroup(app, owner);
    const personalGroupId = await createGroup(app, owner, GroupType.PERSONAL);

    await invite(app, owner, sharedGroupId, `  ${target.email.toUpperCase()}  `)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          groupId: sharedGroupId,
          email: target.email,
          status: InvitationStatus.PENDING,
        });
        expect(body.token).toBeUndefined();
      });
    await invite(app, owner, sharedGroupId, target.email)
      .expect(409)
      .expect({ code: ErrorCode.INVITATION_ALREADY_PENDING });

    const concurrentTarget = await register(app, 'invite-concurrent');
    const concurrentGroupId = await createGroup(app, owner);
    const concurrentInvites = await Promise.all([
      invite(app, owner, concurrentGroupId, concurrentTarget.email),
      invite(app, owner, concurrentGroupId, concurrentTarget.email),
    ]);
    expect(concurrentInvites.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      await prisma.invitation.count({
        where: { groupId: concurrentGroupId, email: concurrentTarget.email },
      }),
    ).toBe(1);
    await invite(app, owner, sharedGroupId, 'missing@example.com')
      .expect(404)
      .expect({ code: ErrorCode.INVITEE_NOT_FOUND });
    await invite(app, owner, personalGroupId, target.email)
      .expect(409)
      .expect({ code: ErrorCode.INVITATION_NOT_ALLOWED });
    await invite(app, outsider, sharedGroupId, target.email)
      .expect(404)
      .expect({ code: ErrorCode.GROUP_NOT_FOUND });

    await prisma.membership.createMany({
      data: [
        { groupId: sharedGroupId, userId: member.userId, role: MembershipRole.MEMBER },
        { groupId: sharedGroupId, userId: admin.userId, role: MembershipRole.ADMIN },
      ],
    });
    await invite(app, member, sharedGroupId, outsider.email)
      .expect(403)
      .expect({ code: ErrorCode.INVITATION_FORBIDDEN });
    await invite(app, admin, sharedGroupId, outsider.email)
      .expect(403)
      .expect({ code: ErrorCode.INVITATION_FORBIDDEN });
    await invite(app, owner, sharedGroupId, member.email)
      .expect(409)
      .expect({ code: ErrorCode.GROUP_MEMBER_ALREADY_EXISTS });
  });

  it('lists only the invitee pending invitations and validates acceptance identity/state', async () => {
    const owner = await register(app, 'list-owner');
    const invitee = await register(app, 'list-invitee');
    const other = await register(app, 'list-other');
    const activeGroupId = await createGroup(app, owner);
    const expiredGroupId = await createGroup(app, owner);
    const acceptedGroupId = await createGroup(app, owner);

    await invite(app, owner, activeGroupId, invitee.email).expect(201);
    await invite(app, owner, expiredGroupId, invitee.email).expect(201);
    await invite(app, owner, acceptedGroupId, invitee.email).expect(201);
    const activeToken = await findToken(app, invitee, activeGroupId);
    const acceptedToken = await findToken(app, invitee, acceptedGroupId);
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${acceptedToken}/accept`)
      .set(invitee.authorization)
      .expect(200);
    await prisma.invitation.update({
      where: { groupId_email: { groupId: expiredGroupId, email: invitee.email } },
      data: { expiresAt: dayjs().subtract(1, 'minute').toDate() },
    });

    await request(app.getHttpServer())
      .get('/api/v1/invitations')
      .set(invitee.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ groupId: activeGroupId, token: activeToken });
      });
    await request(app.getHttpServer())
      .get('/api/v1/invitations')
      .set(other.authorization)
      .expect(200)
      .expect([]);
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${activeToken}/accept`)
      .set(other.authorization)
      .expect(404)
      .expect({ code: ErrorCode.INVITATION_NOT_FOUND });

    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${activeToken}/accept`)
      .set(invitee.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: activeGroupId,
          currentUserRole: MembershipRole.MEMBER,
        });
      });
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${activeToken}/accept`)
      .set(invitee.authorization)
      .expect(404)
      .expect({ code: ErrorCode.INVITATION_NOT_FOUND });

    const expiredInvitation = await prisma.invitation.findUniqueOrThrow({
      where: { groupId_email: { groupId: expiredGroupId, email: invitee.email } },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${expiredInvitation.token}/accept`)
      .set(invitee.authorization)
      .expect(404)
      .expect({ code: ErrorCode.INVITATION_NOT_FOUND });
  });

  it('keeps concurrent acceptance and membership races consistent', async () => {
    const owner = await register(app, 'race-owner');
    const invitee = await register(app, 'race-invitee');
    const existingMember = await register(app, 'race-existing');
    const groupId = await createGroup(app, owner);
    const existingGroupId = await createGroup(app, owner);

    await invite(app, owner, groupId, invitee.email).expect(201);
    const token = await findToken(app, invitee, groupId);
    const results = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/invitations/${token}/accept`)
        .set(invitee.authorization),
      request(app.getHttpServer())
        .post(`/api/v1/invitations/${token}/accept`)
        .set(invitee.authorization),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([200, 404]);
    expect(await prisma.membership.count({ where: { groupId, userId: invitee.userId } })).toBe(1);
    await expect(
      prisma.invitation.findUniqueOrThrow({
        where: { groupId_email: { groupId, email: invitee.email } },
      }),
    ).resolves.toMatchObject({ status: InvitationStatus.ACCEPTED });

    await invite(app, owner, existingGroupId, existingMember.email).expect(201);
    const existingToken = await findToken(app, existingMember, existingGroupId);
    await prisma.membership.create({
      data: {
        groupId: existingGroupId,
        userId: existingMember.userId,
        role: MembershipRole.MEMBER,
      },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${existingToken}/accept`)
      .set(existingMember.authorization)
      .expect(409)
      .expect({ code: ErrorCode.GROUP_MEMBER_ALREADY_EXISTS });
    await expect(
      prisma.invitation.findUniqueOrThrow({
        where: { groupId_email: { groupId: existingGroupId, email: existingMember.email } },
      }),
    ).resolves.toMatchObject({ status: InvitationStatus.PENDING });
  });
});
