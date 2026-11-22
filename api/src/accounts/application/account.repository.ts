import type { Account } from '../domain/account.js';

/** Persistence port: no ORM types cross this boundary. */
export interface AccountRepository {
  list(parentCode?: string): Promise<Account[]>;
  find(code: string): Promise<Account | null>;
  hasChildren(code: string): Promise<boolean>;
  insert(account: Account): Promise<Account>;
  update(account: Account): Promise<Account>;
  delete(code: string): Promise<void>;
}

/** Atomic execution without exposing database connections to use cases. */
export interface AccountUnitOfWork {
  run<T>(operation: (repository: AccountRepository) => Promise<T>): Promise<T>;
}
