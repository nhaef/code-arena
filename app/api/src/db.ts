import { Connection, createConnection } from 'typeorm';
import { InsertOneWriteOpResult, MongoClient, WithId } from 'mongodb';
import { GameEntry, Game, User } from './models';

interface RelDatabaseConfiguration {
    type: 'postgres' | 'mysql' | 'mssql';
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/`;
const relDataConfig: RelDatabaseConfiguration = {
    type: process.env.DATABASE_TYPE as any || 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '12345',
    database: process.env.DATABASE_NAME || 'codearena'
};


//TODO: remove unnecessary typing. All config will be done in here for now so interface exports not needed.
export class DatabaseProvider {
    private static connection: Connection;

    public static async getConnection(): Promise<Connection> {
        if (DatabaseProvider.connection) {
            return DatabaseProvider.connection;
        }

        const { type, host, port, username, password, database } = relDataConfig;
        DatabaseProvider.connection = await createConnection({
            type, host, port, username, password, database,
            entities: [User, Game, GameEntry],
            synchronize: true
        });

        return DatabaseProvider.connection;
    }
}

export function getMongoClient(): MongoClient {
    return new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}

export async function getUserByUname(uname: string): Promise<User> {
    const connection = await DatabaseProvider.getConnection();

    const returnedUser = await connection.getRepository(User).findOne(uname);

    if(!returnedUser) return Promise.reject(new Error(`No user with username ${uname}.`));

    return returnedUser;
}

export async function createUser(user: User): Promise<User> {
    const connection = await DatabaseProvider.getConnection();

    return await connection.getRepository(User).save(user);
}

