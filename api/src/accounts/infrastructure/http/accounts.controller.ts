import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccountsUseCases } from '../../application/accounts.use-cases.js';
import type { Account, CreateAccountInput } from '../../domain/account.js';

function body(value: unknown, allowed: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !allowed.includes(k))
  ) {
    throw new BadRequestException('Cuerpo inválido o campos no permitidos.');
  }
  return value as Record<string, unknown>;
}
function present(account: Account) {
  return { ...account.toData(), level: account.level };
}

@Controller('accounts')
export class AccountsController {
  constructor(
    @Inject(AccountsUseCases) private readonly accounts: AccountsUseCases,
  ) {}

  @Get()
  async list(@Query('parentCode') parentCode?: string) {
    return (await this.accounts.list(parentCode)).map(present);
  }

  @Get(':code')
  async get(@Param('code') code: string) {
    return present(await this.accounts.get(code));
  }

  @Post()
  async create(@Body() input: unknown) {
    const data = body(input, ['code', 'name', 'nature']);
    if (typeof data.code !== 'string' || typeof data.name !== 'string') {
      throw new BadRequestException('El código y el nombre deben ser texto.');
    }
    if (
      data.nature !== undefined &&
      data.nature !== 'DEBIT' &&
      data.nature !== 'CREDIT'
    ) {
      throw new BadRequestException('La naturaleza debe ser DEBIT o CREDIT.');
    }
    const command: CreateAccountInput = {
      code: data.code,
      name: data.name,
      nature: data.nature,
    };
    return present(await this.accounts.create(command));
  }

  @Patch(':code')
  async update(@Param('code') code: string, @Body() input: unknown) {
    const data = body(input, ['name']);
    if (typeof data.name !== 'string')
      throw new BadRequestException('El nombre debe ser texto.');
    return present(await this.accounts.update(code, data.name));
  }

  @Delete(':code')
  @HttpCode(204)
  remove(@Param('code') code: string) {
    return this.accounts.remove(code);
  }
}
