// Centralized error handler. Keeps stray exceptions from leaking stack
// traces to the client and gives the frontend a consistent { error } shape.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
}

module.exports = errorHandler;
