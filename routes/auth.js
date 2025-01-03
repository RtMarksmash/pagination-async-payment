const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', authController.postLogin);

router.post('/signup', [
        body('email')
        .isEmail()
        .withMessage('please insert validate information')
        .custom((value, { req }) => {
            if (value === 'mario@mora.com') {
                throw new Error('forbbiden user');
            }
            return true;


        }),
        body('password', 'please enter 4 numbers or letter at least on this password input')
        .isLength({ min: 4 })
        .isAlphanumeric(),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('passwords have to match!!');
            }
            return true;
        })
    ],
    authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;