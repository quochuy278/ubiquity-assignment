import { Module } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { MembershipRepository } from './repositories/membership.repository';

@Module({
  providers: [MembershipService, MembershipRepository],
  exports: [MembershipService],
})
export class MembershipModule {}
