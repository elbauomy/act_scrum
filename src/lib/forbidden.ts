/** Thrown when a view-only account tries to change something. */
export class ForbiddenError extends Error {
  constructor() {
    super("This account is view-only. It cannot change anything.");
  }
}
