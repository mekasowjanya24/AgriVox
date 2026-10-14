export const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const keyPattern = err.keyPattern || {};
    const keyFields = Object.keys(keyPattern);

    if (keyFields.includes('phone') || err.message?.includes('phone_1') || err.keyValue?.phone) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered. Please log in.',
        field: 'phone',
      });
    }

    if (keyFields.includes('email') || err.message?.includes('email_1') || err.keyValue?.email) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered. Please log in.',
        field: 'email',
      });
    }

    const field = keyFields[0] || 'information';
    return res.status(409).json({
      success: false,
      message: `This ${field} is already registered. Please log in.`,
      field,
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
