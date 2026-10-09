// Central error handler — consistent { error: { code, message } } envelope, no stack leakage.
function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'That endpoint does not exist' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const code =
    err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE'
    : err.code === 'UNSUPPORTED_FILE_TYPE' ? 'UNSUPPORTED_FILE_TYPE'
    : err.code || 'INTERNAL_ERROR';
  const message =
    code === 'FILE_TOO_LARGE' ? `File exceeds the ${require('../../config').maxUploadMb} MB limit`
    : err.code === 'UNSUPPORTED_FILE_TYPE' ? 'Only PDF, PNG and JPEG files are accepted'
    : status === 500 ? 'Something went wrong on our side'
    : err.message;
  if (status === 500) console.error('[evidentia]', err);
  res.status(status).json({ error: { code, message } });
}

module.exports = { notFound, errorHandler };
