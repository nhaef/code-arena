export interface User {
    alias: string;
    uname: string;
    email: string;
    secret: string;
    salt: string;
}

export function objIsUser(obj: any): obj is User {
    return obj 
        && obj.alias && typeof obj.alias === 'string'
        && obj.uname && typeof obj.uname === 'string'
        && obj.email && typeof obj.email === 'string'
        && obj.secret && typeof obj.secret === 'string'
        && obj.salt && typeof obj.salt === 'string'
}