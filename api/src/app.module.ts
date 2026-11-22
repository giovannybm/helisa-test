import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ProblemDetailsFilter } from './problem-details.filter.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { AccountsModule } from './accounts/accounts.module.js';

@Module({
  imports: [AccountsModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
