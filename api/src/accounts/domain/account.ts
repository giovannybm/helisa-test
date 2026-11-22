import { AccountConflictError, InvalidAccountError } from './errors.js';

export type Nature = 'DEBIT' | 'CREDIT';
export type AccountLevel = 'CLASS' | 'GROUP' | 'ACCOUNT' | 'SUBACCOUNT';
export interface AccountData {
  code: string;
  name: string;
  nature: Nature;
  parentCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateAccountInput {
  code: string;
  name: string;
  nature?: Nature;
}
const parentLengths: Record<number, number> = { 1: 0, 2: 1, 4: 2, 6: 4 };
const levels: Record<number, AccountLevel> = {
  1: 'CLASS',
  2: 'GROUP',
  4: 'ACCOUNT',
  6: 'SUBACCOUNT',
};

export class Account {
  private constructor(private readonly data: AccountData) {}

  static validateCode(value: string): string {
    if (
      typeof value !== 'string' ||
      !/^[1-9][0-9]*$/.test(value) ||
      !(value.length in parentLengths)
    ) {
      throw new InvalidAccountError(
        'El código debe tener 1, 2, 4 o 6 dígitos y no comenzar por cero.',
      );
    }
    return value;
  }

  static parentCode(code: string): string | null {
    return this.validateCode(code).slice(0, parentLengths[code.length]) || null;
  }

  private static validateName(value: string): string {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > 200
    ) {
      throw new InvalidAccountError(
        'El nombre es obligatorio y debe tener máximo 200 caracteres.',
      );
    }
    return value.trim();
  }

  static create(input: CreateAccountInput, parent: Account | null): Account {
    const parentCode = this.parentCode(input.code);
    const name = this.validateName(input.name);
    if (parentCode !== (parent?.code ?? null)) {
      throw new InvalidAccountError(
        `Debe existir primero la cuenta padre ${parentCode}.`,
      );
    }
    if (
      input.nature !== undefined &&
      input.nature !== 'DEBIT' &&
      input.nature !== 'CREDIT'
    ) {
      throw new InvalidAccountError('La naturaleza debe ser DEBIT o CREDIT.');
    }
    const nature = parent?.nature ?? input.nature;
    if (!nature)
      throw new InvalidAccountError(
        'La clase requiere naturaleza DEBIT o CREDIT.',
      );
    if (
      parent &&
      input.nature !== undefined &&
      input.nature !== parent.nature
    ) {
      throw new InvalidAccountError(
        'La naturaleza debe coincidir con la del padre.',
      );
    }
    const now = new Date();
    return new Account({
      code: input.code,
      name,
      nature,
      parentCode,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(data: AccountData): Account {
    return new Account({ ...data });
  }
  get code() {
    return this.data.code;
  }
  get nature() {
    return this.data.nature;
  }
  get level(): AccountLevel {
    return levels[this.code.length];
  }

  rename(name: string): Account {
    return new Account({
      ...this.data,
      name: Account.validateName(name),
      updatedAt: new Date(),
    });
  }

  assertCanDelete(hasChildren: boolean): void {
    if (hasChildren)
      throw new AccountConflictError(
        'No se puede eliminar una cuenta con hijos.',
        'ACCOUNT_HAS_CHILDREN',
      );
  }

  toData(): AccountData {
    return { ...this.data };
  }
}
