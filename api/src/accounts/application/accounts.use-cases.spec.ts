import { Account } from '../domain/account.js';
import {
  AccountConflictError,
  AccountNotFoundError,
  InvalidAccountError,
} from '../domain/errors.js';
import { AccountsUseCases } from './accounts.use-cases.js';
import type { AccountRepository } from './account.repository.js';

// No Nest testing module, database, Prisma, or framework mocks.
function setup() {
  const rows = new Map<string, Account>();
  const repository: AccountRepository = {
    list: async (parent) =>
      [...rows.values()].filter(
        (a) => parent === undefined || a.toData().parentCode === parent,
      ),
    find: async (code) => rows.get(code) ?? null,
    hasChildren: async (code) =>
      [...rows.values()].some((a) => a.toData().parentCode === code),
    insert: async (account) => {
      if (rows.has(account.code)) throw new AccountConflictError('Duplicado');
      rows.set(account.code, account);
      return account;
    },
    update: async (account) => {
      rows.set(account.code, account);
      return account;
    },
    delete: async (code) => {
      rows.delete(code);
    },
  };
  return new AccountsUseCases(repository, {
    run: (operation) => operation(repository),
  });
}

describe('AccountsUseCases (sin infraestructura)', () => {
  it('exige padre inmediato y hereda la naturaleza', async () => {
    const useCases = setup();
    await expect(
      useCases.create({ code: '31', name: 'Grupo' }),
    ).rejects.toBeInstanceOf(InvalidAccountError);
    await useCases.create({ code: '3', name: 'Patrimonio', nature: 'CREDIT' });
    const group = await useCases.create({ code: '31', name: 'Capital' });
    expect(group.nature).toBe('CREDIT');
    expect(group.level).toBe('GROUP');
    await expect(
      useCases.create({ code: '3105', name: 'Cuenta', nature: 'DEBIT' }),
    ).rejects.toBeInstanceOf(InvalidAccountError);
  });

  it('protege padres y permite eliminar hojas', async () => {
    const useCases = setup();
    await useCases.create({ code: '2', name: 'Pasivo', nature: 'CREDIT' });
    await useCases.create({ code: '21', name: 'Obligaciones' });
    await expect(useCases.remove('2')).rejects.toBeInstanceOf(
      AccountConflictError,
    );
    await useCases.remove('21');
    await useCases.remove('2');
    await expect(useCases.get('2')).rejects.toBeInstanceOf(
      AccountNotFoundError,
    );
  });

  it('actualiza el nombre sin alterar identidad ni naturaleza', async () => {
    const useCases = setup();
    await useCases.create({ code: '1', name: 'Activo', nature: 'DEBIT' });
    const updated = await useCases.update('1', ' Activos ');
    expect(updated.toData()).toMatchObject({
      code: '1',
      name: 'Activos',
      nature: 'DEBIT',
      parentCode: null,
    });
    await expect(useCases.update('1', ' ')).rejects.toBeInstanceOf(
      InvalidAccountError,
    );
  });
});

describe('Account (dominio puro)', () => {
  it.each(['', '01', '123', '12345', '1234567', 'abc'])(
    'rechaza el código %s',
    (code) => {
      expect(() =>
        Account.create({ code, name: 'Cuenta', nature: 'DEBIT' }, null),
      ).toThrow(InvalidAccountError);
    },
  );
  it('requiere naturaleza en clases y nombre válido', () => {
    expect(() => Account.create({ code: '1', name: 'Activo' }, null)).toThrow(
      InvalidAccountError,
    );
    expect(() =>
      Account.create({ code: '1', name: ' ', nature: 'DEBIT' }, null),
    ).toThrow(InvalidAccountError);
  });
});
