import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServerHealth() {
    return {
      message: "Healthy Wallet Service",
      data: null
    };
  }
}
