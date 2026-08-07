export enum GroupType {
  PERSONAL = 'PERSONAL',
  SHARED = 'SHARED',
}

export function isGroupType(value: string): value is GroupType {
  return value === GroupType.PERSONAL || value === GroupType.SHARED;
}
