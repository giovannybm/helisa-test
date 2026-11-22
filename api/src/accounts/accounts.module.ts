import { Module } from '@nestjs/common';
import { AccountsUseCases } from './application/accounts.use-cases.js';
import { AccountsController } from './infrastructure/http/accounts.controller.js';
import { PrismaService } from './infrastructure/persistence/prisma.service.js';
import {
  PrismaAccountRepository,
  PrismaAccountUnitOfWork,
} from './infrastructure/persistence/prisma-account.repository.js';

/** Composition root: only this outer layer selects the concrete adapters. */
@Module({
  controllers: [AccountsController],
  providers: [
    PrismaService,
    {
      provide: AccountsUseCases,
      inject: [PrismaService],
      useFactory: (db: PrismaService) =>
        new AccountsUseCases(
          new PrismaAccountRepository(db),
          new PrismaAccountUnitOfWork(db),
        ),
    },
  ],
})
export class AccountsModule {}
