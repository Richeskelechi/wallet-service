import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { sendSuccess } from './utils/helpers/response.helpers';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Server health check',
    description: 'Returns the current health status of the Wallet Service API.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server is running',
    type: HealthResponseDto,
  })
  getServerHealth() {
    const response = this.appService.getServerHealth();
    return sendSuccess(response, response.message);
  }
}
