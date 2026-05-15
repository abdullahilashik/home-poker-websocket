import { Injectable } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHostInfo(): { ip: string; port: number } {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return { ip: iface.address, port: 3000 };
        }
      }
    }
    return { ip: 'localhost', port: 3000 };
  }
}
