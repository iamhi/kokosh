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

  if (err.toolCalls !== undefined) {
    return res.status(200).json({
      success: false,
      result: { answer: err.answer ?? null, toolCalls: err.toolCalls, error: err.message },
    });
  }

  return res
    .status(500)
    .json({ error: err.message || 'Internal Server Error' });
};
