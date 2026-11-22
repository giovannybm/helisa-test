import { Prisma } from '@prisma/client';
import { Account } from '../../domain/account.js';
import {
  AccountConflictError,
  AccountNotFoundError,
} from '../../domain/errors.js';
import type {
  AccountRepository,
  AccountUnitOfWork,
} from '../../application/account.repository.js';
import type { PrismaService } from './prisma.service.js';

function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new AccountConflictError(
        'El código ya existe.',
        'ACCOUNT_CODE_EXISTS',
      );
    if (error.code === 'P2003')
      throw new AccountConflictError(
        'La operación viola la relación entre padre e hijos.',
        'ACCOUNT_RELATION_CONFLICT',
      );
    if (error.code === 'P2025') throw new AccountNotFoundError();
    if (error.code === 'P2034')
      throw new AccountConflictError(
        'Conflicto concurrente. Reintente la operación.',
        'CONCURRENT_MODIFICATION',
      );
  }
  throw error;
}

export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return translate(error);
    }
  }

  list(parentCode?: string): Promise<Account[]> {
    return this.execute(async () =>
      (
        await this.db.account.findMany({
          where: parentCode === undefined ? {} : { parentCode },
          orderBy: { code: 'asc' },
        })
      ).map((row) => Account.restore(row)),
    );
  }

  find(code: string): Promise<Account | null> {
    return this.execute(async () => {
      const row = await this.db.account.findUnique({ where: { code } });
      return row ? Account.restore(row) : null;
    });
  }

  hasChildren(code: string): Promise<boolean> {
    return this.execute(
      async () =>
        (await this.db.account.count({ where: { parentCode: code } })) > 0,
    );
  }

  insert(account: Account): Promise<Account> {
    return this.execute(async () =>
      Account.restore(await this.db.account.create({ data: account.toData() })),
    );
  }

  update(account: Account): Promise<Account> {
    const { name, updatedAt } = account.toData();
    return this.execute(async () =>
      Account.restore(
        await this.db.account.update({
          where: { code: account.code },
          data: { name, updatedAt },
        }),
      ),
    );
  }

  delete(code: string): Promise<void> {
    return this.execute(async () => {
      await this.db.account.delete({ where: { code } });
    });
  }
}

export class PrismaAccountUnitOfWork implements AccountUnitOfWork {
  constructor(private readonly db: PrismaService) {}
  async run<T>(
    operation: (repository: AccountRepository) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.db.$transaction((tx) =>
        operation(new PrismaAccountRepository(tx)),
      );
    } catch (error) {
      return translate(error);
    }
  }
}
