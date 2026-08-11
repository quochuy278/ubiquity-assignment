import type { Group } from '@prisma/client';
import type { MembershipRole } from '../membership/membership.constants';
import type { GroupType } from './group.constants';

export interface CreateGroupInput {
  type: GroupType;
  name: string;
}

export type GroupRecord = Omit<Group, 'type'> & {
  type: GroupType;
};

export type GroupResult = GroupRecord & {
  currentUserRole: MembershipRole;
};
