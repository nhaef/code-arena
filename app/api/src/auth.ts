import { BasicStrategy } from 'passport-http';
import sha from 'jssha';

import { User } from './models';
import { getUserByUsername } from './db';

export function serializeUser(user: any, done: (err: any, username?: string) => void) {
    if (!(user instanceof User)) return done('user object not valid!');

    done(null, user.username);
}

export function deserializeUser(username: string, done: (err: any, user?: User) => void) {
    getUserByUsername(username).then((user: User | undefined) => done(null, user)).catch(
        (reason) => done(reason)
    );
}

export const localStrategy: BasicStrategy = new BasicStrategy((username: string, password: string, done) => {
    getUserByUsername(username).then((user: User | undefined) => {
        if (!user) return done(null, false);
        const passwordHash = getHashedPassword(password, user.salt);
        if (user.passwordHash === passwordHash) done(null, user);
        else done(null, false);
    }).catch((reason) => done(reason));
});

export function getHashedPassword(password: string, salt: string): string {
    // Get hash from salt + password
    const hash = new sha('SHA3-512', 'TEXT');
    hash.update(salt);
    hash.update(password);

    return hash.getHash('HEX');
}