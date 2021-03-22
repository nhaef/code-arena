export interface User {
    displayname: string;
    username: string;
    email: string;
    passwordHash: string;
    salt: string;
}

export function objIsUser(obj: any): obj is User {
    return obj 
        && obj.displayname && typeof obj.displayname === 'string'
        && obj.username && typeof obj.username === 'string'
        && obj.email && typeof obj.email === 'string'
        && obj.passwordHash && typeof obj.passwordHash === 'string'
        && obj.salt && typeof obj.salt === 'string'
}