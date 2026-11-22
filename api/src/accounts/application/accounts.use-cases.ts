import { Account, type CreateAccountInput } from '../domain/account.js';
import { AccountNotFoundError } from '../domain/errors.js';
import type {
  AccountRepository,
  AccountUnitOfWork,
} from './account.repository.js';

export class AccountsUseCases {
  constructor(
    private readonly repository: AccountRepository,
    private readonly unitOfWork: AccountUnitOfWork,
  ) {}

  list(parentCode?: string): Promise<Account[]> {
    if (parentCode !== undefined) Account.validateCode(parentCode);
    return this.repository.list(parentCode);
  }

  async get(code: string): Promise<Account> {
    return this.require(this.repository, code);
  }

  create(input: CreateAccountInput): Promise<Account> {
    const parentCode = Account.parentCode(input.code);
    return this.unitOfWork.run(async (repository) => {
      const parent = parentCode ? await repository.find(parentCode) : null;
      return repository.insert(Account.create(input, parent));
    });
  }

  update(code: string, name: string): Promise<Account> {
    return this.unitOfWork.run(async (repository) => {
      const account = await this.require(repository, code);
      return repository.update(account.rename(name));
    });
  }

  remove(code: string): Promise<void> {
    return this.unitOfWork.run(async (repository) => {
      const account = await this.require(repository, code);
      account.assertCanDelete(await repository.hasChildren(code));
      await repository.delete(code);
    });
  }

  private async require(
    repository: AccountRepository,
    code: string,
  ): Promise<Account> {
    const account = await repository.find(Account.validateCode(code));
    if (!account) throw new AccountNotFoundError();
    return account;
  }
}
