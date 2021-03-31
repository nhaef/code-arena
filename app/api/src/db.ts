import { Connection, createConnection, DeleteResult, EntityTarget, MongoError, Repository } from 'typeorm';
import { MongoClient, ObjectID } from 'mongodb';
import { GameEntry, Game, User, Code } from './models';

//TODO: Implement checking functionality for these types.
//TODO: Implement subrelations i.e. entries.game etc.
type gameRelations = 'entries';
type userRelations = 'gameEntries';
type gameEntryRelations = 'game' | 'submitter';

export function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error('Assertion error: ' + msg);
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


var dbConnection: Connection;
export async function getConnection(): Promise<Connection> {
    if (dbConnection) {
        return dbConnection;
    }

    const { type, host, port, username, password, database } = relDataConfig;
    dbConnection = await createConnection({
        type, host, port, username, password, database,
        entities: [User, Game, GameEntry],
        synchronize: true//FIXME: Warning this HAS to be REMOVED after development. With this flag set any change to the schema will delete all db tables!
    }).catch((reason) => {
        throw reason;
    });

    return dbConnection;
}

var mongoClient: MongoClient;
export async function getCollection<T>(name: string) {
    return await (await getClient()).db('code-arena').collection<T>(name);
}

export async function getClient(): Promise<MongoClient> {

    //FIXME: Can we cache the client like this? It seems to crash very rarely D:
    // Needs more testing and knowledge about async and Mongo for this
    if (mongoClient) return mongoClient;

    mongoClient = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    mongoClient = await mongoClient.connect().catch((reason) => {
        throw reason;
    });

    return mongoClient;
}


export async function getUserByUsername(Username: string, relations?: userRelations[]): Promise<User | undefined> {

    const connection = await getConnection();

    const returnedUser = await connection.getRepository(User).findOne({ where: { username: Username }, relations: relations });

    return returnedUser;
}

export async function getUserByEmail(email: string, relations?: userRelations[]): Promise<User | undefined> {

    const connection = await getConnection();

    const returnedUser = await connection.getRepository(User).findOne({ where: { email: email }, relations: relations });

    return returnedUser;
}

export async function createUser(user: User): Promise<User> {

    if (await getUserByUsername(user.username).catch(reason => {
        throw reason;
    })) {
        return Promise.reject(new Error('Username already taken.'));
    }

    if (await getUserByEmail(user.email).catch(reason => {
        throw reason;
    })) {
        return Promise.reject(new Error('Email already taken.'));
    }

    const connection = await getConnection().catch(reason => {
        throw reason;
    });

    const createdUser = await connection.getRepository(User).save(user).catch(reason => {
        throw reason;
    });

    return createdUser;
}

export async function deleteUserByUsername(username: string): Promise<User | undefined> {

    const user = await getUserByUsername(username);

    if (!user) return undefined;

    const connection = await getConnection();

    await connection.getRepository(User).delete({ username: username });

    assert(await getUserByUsername(username) === undefined, 'deleteUserByUsername failed to delete.');
    return user;
}

export async function getGameCode(objectID: string): Promise<Code | undefined> {
    return getCodeFrom(new ObjectID(objectID), 'games');
}

async function setGameCode(code: Code): Promise<string> {
    return (await setCodeIn(code, 'games')).toHexString();
}

export async function getEntryCode(objectID: string): Promise<Code | undefined> {
    return getCodeFrom(new ObjectID(objectID), 'entries');
}

async function setEntryCode(code: Code): Promise<string> {
    return (await setCodeIn(code, 'entries')).toHexString();
}

export async function createGame(game: Game, code: Code): Promise<Game> {
    const connection = await getConnection();

    // Check that the name for the game is not yet in use.
    const checkGame = await connection.getRepository(Game).findOne({ name: game.name }).catch((reason) => {
        console.log(reason);
    });
    if (checkGame) return Promise.reject(new Error('Game name already in use.'));


    const _id = await setGameCode(code).catch((reason) => {
        console.log(reason);
        return null;
    });

    if (!_id) {
        throw new Error('Saving Code in Mongo has failed. in createGame');
    }

    game.gameCodeID = _id


    const savedGame = await connection.getRepository(Game).save(game).catch(async (reason) => {
        await deleteCodeFrom(new ObjectID(_id), 'games').catch(reason => {
            //ERROR SOMETHING HAS GONE TERRIBLY WRONG and both databases are not working as expected.
            //FIXME: This leaves an headless entry in Mongo! Log this somewhere where an admin can fix this by hand. THIS SHOULD NOT HAPPEN!
            throw reason;
        });

        throw new Error(reason);
    });

    const foundGame = await getGame(game.name).catch(reason => {
        throw reason;
    });

    assert(foundGame, 'Game was not saved.');

    return savedGame;
}

export async function getGame(name: string, relations?: gameRelations[]): Promise<Game | undefined> {
    const connection = await getConnection();

    const foundGame = await connection.getRepository(Game).findOne({ where: { name: name }, relations: relations });

    return foundGame;
}

export async function deleteGame(name: string): Promise<Game | undefined> {
    const connection = await getConnection();

    const foundGame = await connection.getRepository(Game).findOne(name);

    if (foundGame) await connection.getRepository(Game).delete({ name: name });

    return foundGame;
}

export async function createEntry(entry: GameEntry, code: Code): Promise<GameEntry> {
    const connection = await getConnection();

    if (!await getGame(entry.game.name)) return Promise.reject(new Error('Game: ' + entry.game.name + ' does not exist.'));
    if (!await getUserByUsername(entry.submitter.username)) return Promise.reject(new Error('User: ' + entry.submitter.username + ' does not exist.'));

    const _id = await setEntryCode(code).catch((reason) => {
        console.log(reason);
        return null;
    });

    if (!_id) {
        throw new Error('Saving Code in Mongo has failed. in createEntry');
    }

    entry.submittedCodeID = _id;


    const savedEntry = await connection.getRepository(GameEntry).save(entry).catch(async (reason) => {
        await deleteCodeFrom(new ObjectID(_id), 'entries').catch(reason => {
            //ERROR SOMETHING HAS GONE TERRIBLY WRONG and both databases are not working as expected.
            //FIXME: This leaves an headless entry in Mongo! Log this somewhere where an admin can fix this by hand. THIS SHOULD NOT HAPPEN!
            throw reason;
        });

        throw new Error(reason);
    });


    const foundEntry = await getEntry(savedEntry.id, ['game', 'submitter']).catch(reason => {
        throw reason;
    });


    assert(foundEntry, 'Entry was not saved.');
    assert(foundEntry.game.equals(entry.game) && foundEntry.submitter.equals(entry.submitter) && foundEntry.submittedCodeID === entry.submittedCodeID, 'foundEntry and entry are not equivalent.');

    const game = await getGame(foundEntry.game.name, ['entries']).catch(reason => {
        throw reason;
    });

    assert(game, 'Game does not exist, even though it did earlier');
    assert(game.entries, 'Game does not have entries');
    assert(game.entries.some(e => e.equals(entry)), 'entry not in game.entries.');

    return savedEntry;
}

export async function getEntry(id: number, relations?: gameEntryRelations[]): Promise<GameEntry | undefined> {
    const connection = await getConnection();

    const foundEntry = await connection.getRepository(GameEntry).findOne({ where: { id: id }, relations: relations });

    return foundEntry;
}

export async function deleteEntry(id: number): Promise<GameEntry | undefined> {
    const connection = await getConnection();

    const foundGame = await connection.getRepository(GameEntry).findOne(id);

    if (foundGame) await connection.getRepository(GameEntry).delete({ id: id });

    return foundGame;
}

async function setCodeIn(code: Code, collectionName: string): Promise<ObjectID> {
    const collection = await getCollection<Code>(collectionName);

    // Create the ObjectID under which this code will be saved in MongoDB.
    const id: ObjectID = new ObjectID();
    code._id = id;

    collection.insertOne(code, async (err, res) => {

        if (err) throw err;

        assert(id === res.insertedId, 'Mongo assigned different ObjectID then provided in setCodeIn');

        const insertedCode = await getCodeFrom(res.insertedId, collectionName).catch((reason) => {
            throw reason;
        });

        // assert that the code to be saved was actually saved correctly
        assert(insertedCode);
        assert(code.equals(insertedCode), `Handed in code ${code} and saved code ${insertedCode} differ. This implies the db is not working as intended.`);
    });

    return id;
}

async function getCodeFrom(objectID: ObjectID, collectionName: string): Promise<Code | undefined> {
    const collection = await getCollection<Code>(collectionName);

    const code = await collection.findOne({ _id: objectID });

    if (!code) return undefined;

    //HACK: This is a disgusting fix to ensure that the code object which is returned will have the .equals function since Mongo does not do this...
    return new Code(code);
}

async function deleteCodeFrom(objectID: ObjectID, collectionName: string): Promise<Code | undefined> {
    const collection = await getCollection<Code>(collectionName);

    const code = await collection.findOne({ _id: objectID });

    if (!code) return undefined;

    await collection.deleteOne({ _id: objectID });

    assert(await getCodeFrom(objectID, collectionName) === undefined, 'Code was still in Mongo after delete.')

    //HACK: This is a disgusting fix to ensure that the code object which is returned will have the .equals function since Mongo does not do this...
    return new Code(code);
}