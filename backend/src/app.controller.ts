import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('host-info')
  getHostInfo(): { ip: string; port: number } {
    return this.appService.getHostInfo();
  }
}
