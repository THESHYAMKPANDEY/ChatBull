import { Request, Response, NextFunction } from 'express';
import { validationResult, body, ValidationChain } from 'express-validator';

// Validation middleware for user registration/login
export const userValidationRules = (): ValidationChain[] => {
  return [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Display name must be between 2 and 30 characters'),
  ];
};

// Validation middleware for message sending
export const messageValidationRules = (): ValidationChain[] => {
  return [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message content is required and must be between 1-1000 characters'),
    body('receiverId')
      .isMongoId()
      .withMessage('Receiver ID must be a valid MongoDB ObjectId'),
  ];
};

// Validation middleware for notification sending
export const notificationValidationRules = (): ValidationChain[] => {
  return [
    body('userId')
      .isMongoId()
      .withMessage('User ID must be a valid MongoDB ObjectId'),
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Notification title is required and must be 1-100 characters'),
    body('body')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Notification body is required and must be 1-500 characters'),
  ];
};

// Generic validation result checker
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Validation for file uploads
export const fileValidationRules = (): ValidationChain[] => {
  return [
    body('fileName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('File name must be 1-100 characters if provided'),
  ];
};

// Validation for user profile updates
export const profileUpdateValidationRules = (): ValidationChain[] => {
  return [
    body('email')
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage('Email must be a valid address'),
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Display name must be between 2 and 30 characters'),
    body('photoURL')
      .optional()
      .isString()
      .withMessage('Photo URL must be a string'),
    body('phoneNumber')
      .optional({ checkFalsy: true })
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Phone number must be a valid international format'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 characters and only contain letters, numbers, and underscores'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage('Bio cannot exceed 150 characters'),
    body('website')
      .optional({ checkFalsy: true })
      .isURL({ require_protocol: true })
      .withMessage('Website must be a valid URL'),
  ];
};
