export function getProductionAblyKey(value: string | undefined): string {
  const ablyKey = value?.trim();

  if (!ablyKey) {
    throw new Error('ABLY_KEY is required in production');
  }

  return ablyKey;
}
