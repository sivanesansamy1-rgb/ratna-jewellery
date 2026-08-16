// Small helper so controllers can throw errors with an HTTP status code
// that the central error handler will respect.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ApiError;
