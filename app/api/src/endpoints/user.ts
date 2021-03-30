import { Request, Response, NextFunction } from 'express';
import { Router } from "express";
import passport from 'passport';
import { createUser } from '../db';
import { getHashedSecret } from '../auth';
import sha from 'jssha';
import { User} from '../models';

const router: Router = Router();

/**
 * @api {post} /api/register Register new user
 * @apiName RegisterUser
 * @apiGroup User
 * 
 * @apiParam {String} displayname Alias username
 * @apiParam {String} username Unique username
 * @apiParam {String} email Unique email
 * @apiParam {String} password User password
 * 
 * @apiSuccessExample {json} Success-Response
 *      POST host/api/register
 *      {
 *          displayname: "some displayname",
 *          username: "some unique username",
 *          email: "unique@e.mail",
 *          password: "very secret password"
 *      }
 * 
 *      HTTP/1.1 204 No Content
 * 
 * @apiSuccessExample {json} Unsuccessful-Response
 *      POST host/api/register
 *      {
 *          displayname: "some displayname",
 *          email: "unique@e.mail"
 *      }
 * 
 *      HTTP/1.1 400 Bad Request
 * 
 * @apiSuccess 204 Successfully registered user
 * 
 * @apiError 400 Bad Request: Missing required params
 */
router.post('/register', (req: Request, res: Response, next: NextFunction) => {
    if (typeof req.body.displayname !== 'string'
        || typeof req.body.username !== 'string'
        || typeof req.body.email !== 'string'
        || typeof req.body.password !== 'string')
        return res.status(400).end();
    
    // Generate random salt
    const hash = new sha('SHA3-512', 'TEXT');
    hash.update(Math.random().toString());
    const salt = hash.getHash('HEX');

    // Create new user
    const user = new User(req.body.username, req.body.email, req.body.displayname, getHashedSecret(req.body.password, salt), salt);

    createUser(user).then(
        () => res.status(204).end(),
        () => res.status(500).end()
    );
});

/**
 * @api {post} /api/login Login existing user
 * @apiDescription Endpoint for Basic Auth
 * @apiName LoginUser
 * @apiGroup User
 * 
 * @apiHeader {string} Authorization Basic-Auth Authorization-header
 * 
 * @apiSuccessExample {json} Authorized-Response
 *      POST username:secret@host/api/login
 * 
 *      HTTP/1.1 204 No Content
 * 
 * @apiErrorExample {json} Unauthorized-Response
 *      POST username:secret@host/api/login
 * 
 *      HTTP/1.1 401 Unauthorized
 * 
 * @apiSuccess 204 No Content: Successfully logged in
 * 
 * @apiError 401 Unauthorized: username or secret incorrect
 */
router.post('/login', passport.authenticate('basic'), (req: Request, res: Response) => {
    res.status(204).end();
});

/**
 * @api {post} /api/logout Logout session
 * @apiDescription Endpoint for Basic Auth Logout
 * @apiName LogoutUser
 * @apiGroup User
 * 
 * @apiSuccessExample {json} Authorized-Response
 *      POST host/api/logout
 * 
 *      HTTP/1.1 204 No Content
 * 
 * @apiSuccess 204 Successfully logged out
 */
 router.post('/logout', (req: Request, res: Response) => {
    req.logout();

    res.status(204).end();
});

export { router as userRouter };