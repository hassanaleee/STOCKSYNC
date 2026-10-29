// An error that carries an HTTP status code.
// Example: throw new HttpError(400, 'Name is required');
// The error handler in index.js turns it into a JSON response.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Turn any value into a number. Empty text becomes NaN (not 0), so we can reject it.
export function toNumber(value) {
  if (value === '' || value === null || value === undefined) return NaN;
  return Number(value);
}
