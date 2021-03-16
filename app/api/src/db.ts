import { Connection, createConnection } from 'typeorm';
import { MongoClient, ObjectID } from 'mongodb';
import { GameEntry, Game, User } from './models';

import {Code} from './../../types/code'

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/`;
const relDataConfig = {
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
            synchronize: true//TODO: Warning this HAS to be REMOVED after development. With this flag set any change to the schema will delete all tables!
        });

        return DatabaseProvider.connection;
    }
}

export class Mongo {
    //Mongo client
    private static mongoClient: MongoClient;

    public static async getClient(): Promise<MongoClient> {
        if (Mongo.mongoClient) return Mongo.mongoClient;
        
        Mongo.mongoClient = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        await Mongo.mongoClient.connect();

        return Mongo.mongoClient;
    }
}


export async function getUserByUname(uname: string): Promise<User | undefined> {
    const connection = await DatabaseProvider.getConnection();

    const returnedUser = await connection.getRepository(User).findOne(uname);

    //TODO: Should this function reject the promise or return undefined if no user with username uname exists?
    //if(!returnedUser) return Promise.reject(new Error(`No user with username ${uname}.`));

    return returnedUser;
}

export async function createUser(user: User): Promise<User> {
    const connection = await DatabaseProvider.getConnection();

    return await connection.getRepository(User).save(user);
}


export async function getGameCode(objectID: ObjectID) {
    return getCodeFrom(objectID, 'games');
}

export async function getEntryCode(objectID: ObjectID) {
    return getCodeFrom(objectID, 'entries');
}

async function getCodeFrom(objectID: ObjectID, collectionName: string) {
    const mongoClient = await Mongo.getClient();

    const collection = mongoClient.db('codearena').collection<Code>(collectionName);

    // Search user
    const code = await collection.findOne({ _id: objectID });

    if (!code) throw new Error(`could not find code in Collection ${collectionName}`);
    return code;
}
