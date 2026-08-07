import { toIsoDateTime } from '../../../../shared/utils/time.utilities';
import type { PublicUser } from '../auth.types';
import type { UserResponseDto } from '../dto/user-response.dto';

export function mapPublicUser(user: PublicUser): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: toIsoDateTime(user.createdAt),
    updatedAt: toIsoDateTime(user.updatedAt),
  };
}
