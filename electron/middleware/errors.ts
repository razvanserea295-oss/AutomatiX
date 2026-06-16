



export class CommandError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'CommandError';
  }

  static badRequest(message: string) { return new CommandError(400, message); }
  static unauthorized(message: string) { return new CommandError(401, message); }
  static forbidden(message: string) { return new CommandError(403, message); }
  static notFound(message: string) { return new CommandError(404, message); }
  static conflict(message: string) { return new CommandError(409, message); }
  static internal(message: string) { return new CommandError(500, message); }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}
