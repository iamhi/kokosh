export const errorHandler = (err, req, res, next) => {
  if (err.username) {
    return res.status(401).json({
      success: false,
      message: err.message,
    });
  } else if (err.token) {
    return res.status(401).json({
      success: false,
      message: err.message,
    });
  }

  console.error(err.stack);

  return res
    .status(500)
    .json({ error: err.message || 'Internal Server Error' });
};
