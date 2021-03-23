import { Connection, createConnection, DeleteResult, EntityTarget, MongoError, Repository } from 'typeorm';
import { MongoClient, ObjectID } from 'mongodb';
import { GameEntry, Game, User, Code } from './models';

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error("Assertion error: " + msg);
    }
}

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/`;
const relDataConfig = {
    type: process.env.DATABASE_TYPE as any || 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '12345',
    database: process.env.DATABASE_NAME || 'codearena'
};


class DatabaseProvider {
    private static connection: Connection;

    public static async getConnection(): Promise<Connection> {
        if (DatabaseProvider.connection) {
            return DatabaseProvider.connection;
        }

        const { type, host, port, username, password, database } = relDataConfig;
        DatabaseProvider.connection = await createConnection({
            type, host, port, username, password, database,
            entities: [User, Game, GameEntry],
            synchronize: true//TODO: Warning this HAS to be REMOVED after development. With this flag set any change to the schema will delete all db tables!
        });

        return DatabaseProvider.connection;
    }
}

class Mongo {
    //Mongo client
    private static mongoClient: MongoClient;

    public static async getCollection<T>(name: string) {
        return await (await Mongo.getClient()).db("code-arena").collection<T>(name);
    }

    public static async getClient(): Promise<MongoClient> {

        //TODO: Can we cache the client like this? It seems to crash sometimes D:
        //Needs more testing and knowledge about async for this
        //if (Mongo.mongoClient) return Mongo.mongoClient;
        
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

export async function createUser(user: User): Promise<User | null> {

    if(await getUserByUname(user.username))return null;

    const connection = await DatabaseProvider.getConnection();

    const createdUser = await connection.getRepository(User).save(user);

    return createdUser;
}

export async function deleteUserByUname(username: string): Promise<boolean> {

    if (!await getUserByUname(username)) return false;

    const connection = await DatabaseProvider.getConnection();

    await connection.getRepository(User).delete({username: username});

    assert(await getUserByUname(username) === undefined, "deleteUserByUsername failed to delete.");
    return true;
}

async function getGameCode(objectID: string): Promise<Code> {
    return getCodeFrom(new ObjectID(objectID), 'games');
}

async function setGameCode(code: Code): Promise<string> {
    return (await setCodeIn(code, 'games')).toHexString();
}

async function getEntryCode(objectID: string): Promise<Code> {
    return getCodeFrom(new ObjectID(objectID), 'entries');
}

async function setEntryCode(code: Code): Promise<string> {
    return (await setCodeIn(code, 'entries')).toHexString();
}

//TODO: should this function get a Game object or contruct it here?
export async function createGame(game: Game, code: Code): Promise<Game | null> {
    const connection = await DatabaseProvider.getConnection();

    //Check that the name for the game is not yet in use.
    const checkGame = await connection.getRepository(Game).findOne({name: game.name}).catch((reason) => {
        console.log(reason);
    });
    if(checkGame)return null;


    const _id = await setGameCode(code).catch((reason) => {
        //TODO: Implement error logging
        console.log(reason);
        return null;
    });

    if(!_id) {
        //TODO: Error loggin and catching i dunno.
        throw new Error("Saving Code in Mongo has failed. in createGame");
    }

    game.gameCodeID = _id

    
    const savedGame = await connection.getRepository(Game).save(game).catch((reason) => {
        //TODO: Implement rollback functionality that will remove the headless Mongo database entry when the mongo db write fails.
        throw new Error(reason);
    });

    return savedGame;
}

//TODO: should this reject the promise when the game is not found, or should it return undefined?
export async function getGame(name:string): Promise<Game | undefined> {
    const connection = await DatabaseProvider.getConnection();

    const foundGame = await connection.getRepository(Game).findOne(name);

    return foundGame;
}

export async function deleteGame(name:string): Promise<Game | undefined> {
    const connection = await DatabaseProvider.getConnection();

    const foundGame = await connection.getRepository(Game).findOne(name);

    if(foundGame)await connection.getRepository(Game).delete({name: name});

    return foundGame;
}

async function setCodeIn(code: Code, collectionName: string): Promise<ObjectID> {
    const collection = await Mongo.getCollection<Code>(collectionName);

    //Create the ObjectID under which this code will be saved in MongoDB.
    const id: ObjectID = new ObjectID();
    code._id = id;

    collection.insertOne(code, async(err, res) => {

        if(err)throw err;

        assert(id === res.insertedId, "Mongo assigned different ObjectID then provided in setCodeIn");

        const insertedCode: Code = await getCodeFrom(res.insertedId, collectionName).catch((reason) => {
            //TODO: Proper logging so I can figure out why, when this goes wrong.
            throw reason;
        });

        //assert that the code to be saved was actually saved correctly
        assert(code.equals(insertedCode), `Handed in code ${code} and saved code ${insertedCode} differ. This implies the db is not working as intended.`);
    });

    return id;
}

async function getCodeFrom(objectID: ObjectID, collectionName: string): Promise<Code> {
    const collection = await Mongo.getCollection<Code>(collectionName);

    const code = await collection.findOne({ _id: objectID });

    if (!code) throw new Error(`could not find code in Collection ${collectionName}`);
    return code;
}
