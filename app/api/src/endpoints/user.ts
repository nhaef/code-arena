import { Request, Response, NextFunction } from 'express';
import { Router } from "express";
import passport from 'passport';
import { createUser } from '../db';
import { User } from '../../../types/user';
import { getHashedSecret } from '../auth';
import sha from 'jssha';

const router: Router = Router();

/**
 * @api {post} /api/register Register new user
 * @apiName RegisterUser
 * @apiGroup User
 * 
 * @apiParam {String} alias Alias username
 * @apiParam {String} uname Unique username
 * @apiParam {String} email Unique email
 * @apiParam {String} secret User password
 * 
 * @apiSuccessExample {json} Success-Response
 *      POST host/api/register
 *      {
 *          alias: "some alias",
 *          uname: "some unique username",
 *          email: "unique@e.mail",
 *          secret: "very secret password"
 *      }
 * 
 *      HTTP/1.1 204 No Content
 * 
 * @apiSuccessExample {json} Unsuccessful-Response
 *      POST host/api/register
 *      {
 *          alias: "some alias",
 *          email: "unique@e.mail"
 *      }
 * 
 *      HTTP/1.1 400 Bad Request
 * 
 * @apiSuccess 204 Successfully registered user
 * 
 * @apiError 400 Bad Request
 */
router.post('/register', (req: Request, res: Response, next: NextFunction) => {
    if(typeof req.body.alias !== 'string'
        || typeof req.body.uname !== 'string'
        || typeof req.body.email !== 'string'
        || typeof req.body.secret !== 'string')
        return res.status(400).end('Missing required params');
    
    // Generate random salt
    const hash = new sha('SHA3-512', 'TEXT');
    hash.update(Math.random().toString());
    const salt = hash.getHash('HEX');

    //Create new user
    const user: User = {
        alias: req.body.alias,
        uname: req.body.uname,
        email: req.body.email,
        secret: getHashedSecret(req.body.secret, salt),
        salt: salt
    };

    createUser(user).then(
        () => res.status(204).end(),
        () => res.status(400).end('Username or email already exists')
    );
});

/**
 * @api {post} /api/login Login existing user
 * @apiDescription Endpoint for Basic Auth Login
 * @apiName LoginUser
 * @apiGroup User
 * 
 * @apiHeader {string} Authorization Basic-Auth Authorization-header
 * 
 * @apiSuccessExample {json} Authorized-Response
 *      POST uname:secret@host/api/login
 * 
 *      HTTP/1.1 204 No Content
 * 
 * @apiErrorExample {json} Unauthorized-Response
 *      POST uname:secret@host/api/login
 * 
 *      HTTP/1.1 401 Unauthorized
 * 
 * @apiSuccess 204 Successfully logged in
 * 
 * @apiError 401 username or secret incorrect
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