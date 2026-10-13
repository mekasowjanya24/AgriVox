export const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {}).join(', ');
    return res.status(409).json({
      success: false,
      message: `A record with this ${fields || 'unique key'} already exists`,
    });
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ID format for ${err.path}`,
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Database validation failed',
      errors,
    });
  }

  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};
