import express, { Router, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import passport from 'passport';
import { deserializeUser, localStrategy, serializeUser } from './auth';
import { userRouter } from './endpoints/user';
const router: Router = Router();

// Setup Middlewares
router.use(express.urlencoded({ extended: true }));
router.use(express.json());
router.use(session({
    secret: process.env.SESSION_SECRET || 'iLikeCats',
    resave: false,
    saveUninitialized: false
}));

// Setup passport
passport.use(localStrategy);
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);
router.use(passport.initialize());
router.use(passport.session());

// Routes
router.use(userRouter);



export { router as apiRouter };