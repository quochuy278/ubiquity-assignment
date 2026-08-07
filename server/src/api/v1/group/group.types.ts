import type { Group } from '@prisma/client';
import type { GroupType } from './group.constants';

export interface CreateGroupInput {
  type: GroupType;
  name: string;
}

export type GroupResult = Omit<Group, 'type'> & {
  type: GroupType;
};
