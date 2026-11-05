/** Safe application error; never attach private resource or session data. */
export class AuthorizationError extends Error {
  readonly code = 'FORBIDDEN'
  readonly status = 403

  constructor() {
    super('ამ მოქმედებაზე წვდომა არ გაქვთ.')
    this.name = 'AuthorizationError'
  }
}
