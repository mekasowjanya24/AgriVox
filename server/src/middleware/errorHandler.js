export const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const keyPattern = err.keyPattern || {};
    const keyFields = Object.keys(keyPattern);

    // Return the phone message ONLY when err.keyPattern contains phone
    if (keyPattern.phone || keyFields.includes('phone')) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered. Please log in.',
        field: 'phone',
      });
    }

    // For any other duplicate-key field, log the real field name server-side and return a generic friendly error, never the phone message
    const realFields = keyFields.length > 0 ? keyFields.join(', ') : (err.message || 'unknown');
    console.error(`[ErrorHandler] Non-phone duplicate key collision on field(s): ${realFields}`, {
      keyPattern,
      keyValue: err.keyValue,
    });

    return res.status(409).json({
      success: false,
      message: 'A duplicate record was detected. Please check your information and try again.',
      field: keyFields[0] || 'duplicate',
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
