import { BasicStrategy } from 'passport-http';
import sha from 'jssha';

import { User, objIsUser } from '../../types/user';
import { getUserByUname } from './db';

export function serializeUser(user: any, done: (err: any, uname?: string) => void) {
    if (!objIsUser(user)) return done('user object not valid!');

    done(null, user.uname);
}

export function deserializeUser(uname: string, done: (err: any, user?: User) => void) {
    getUserByUname(uname).then((user: User | null) => {
        if (!objIsUser(user)) return done('uname not valid!');

        return done(null, user);
    }).catch((reason) => done(reason));
}

export const localStrategy: BasicStrategy = new BasicStrategy((uname: string, secret: string, done) => {
    getUserByUname(uname).then((user: User | null) => {
        if(!objIsUser(user)) return done(null, false);

        const hashedSecret = getHashedSecret(secret, user.salt);
        if(user.secret === hashedSecret) return done(null, user);
        else return done(null, false);
    }).catch((reason) => done(reason));
});

export function getHashedSecret(secret: string, salt: string): string {
    // Get hash from salt + secret
    const hash = new sha('SHA3-512', 'TEXT');
    hash.update(salt);
    hash.update(secret);

    return hash.getHash('HEX');
}