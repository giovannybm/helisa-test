export class InvalidAccountError extends Error {
  readonly code = 'INVALID_ACCOUNT';
}
export class AccountNotFoundError extends Error {
  readonly code = 'ACCOUNT_NOT_FOUND';
  constructor() {
    super('Cuenta no encontrada.');
  }
}
export class AccountConflictError extends Error {
  constructor(
    message: string,
    readonly code = 'ACCOUNT_CONFLICT',
  ) {
    super(message);
  }
}
