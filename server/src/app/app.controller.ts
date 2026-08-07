import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../shared/openapi/api-endpoint.decorator';
import { AppService } from './app.service';
import { AppResponseDto } from './dto/app-response.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiEndpoint({
    operation: { summary: 'Get the application welcome message' },
    response: {
      status: HttpStatus.OK,
      description: 'The application welcome message was retrieved successfully',
      type: AppResponseDto,
    },
  })
  getHello(): AppResponseDto {
    return { message: this.appService.getHello() };
  }
}
