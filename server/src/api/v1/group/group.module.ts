import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MembershipModule } from '../membership/membership.module';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupRepository } from './repositories/group.repository';

@Module({
  imports: [AuthModule, MembershipModule],
  controllers: [GroupController],
  providers: [GroupService, GroupRepository],
  exports: [GroupService],
})
export class GroupModule {}
