// THIS IS JUST AND EXAMPLE.
import { body, header, oneOf, validationResult } from 'express-validator';

export const transactionValidationRules = [
  body('amount')
    .exists()
    .withMessage('Amount is required')
    .isDecimal()
    .withMessage('Amount must be a number'),
  body('description')
    .exists()
    .withMessage('Description is required')
    .isString(),
  body('category').exists().withMessage('Category is required').isString(),
];

export const chatRequest = [
  body('message').exists().withMessage('Message is required').isString(),
];

export const loginRequest = [
  body('username').exists().withMessage('Username is required').isString(),
  body('password').exists().withMessage('Password is required').isString(),
];

export const refreshTokenRequest = [
  oneOf(
    [header('token').exists().isString(), body('token').exists().isString()],
    {
      message: 'Authorization token is missing',
    }
  ),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
};
