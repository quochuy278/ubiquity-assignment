import { type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';
import { ErrorCode } from '../../../../common/exception/error-code';
import { GlobalException } from '../../../../common/exception/global.exception';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = super.canActivate(context);

      return isObservable(result) ? await lastValueFrom(result) : await result;
    } catch {
      throw new GlobalException(ErrorCode.UNAUTHORIZED);
    }
  }
}
