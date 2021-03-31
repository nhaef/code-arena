import { Connection, createConnection, DeleteResult, EntityTarget, MongoError, Repository } from 'typeorm';
import { MongoClient, ObjectID } from 'mongodb';
import { GameEntry, Game, User, Code } from './models';

//TODO: Implement checking functionality for these types.
//TODO: Implement subrelations i.e. entries.game etc.
type gameRelations = 'entries';
type userRelations = 'gameEntries';
type gameEntryRelations = 'game' | 'submitter';

type mongoCollection = 'entries' | 'games';

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

/**
 * Fetches an User from the database
 * @param username Username of the user to be fetched
 * @param relations List of relations which the returned User object should have filled in. These are fetched from the database aswell.
 * @returns A filled in User object with all relations specified populated if a user with username 'username' exists, undefined otherwise
 */
export async function getUserByUsername(username: string, relations?: userRelations[]): Promise<User | undefined> {

    const connection = await getConnection();

    const returnedUser = await connection.getRepository(User).findOne({ where: { username: username }, relations: relations });

    return returnedUser;
}

/**
 * Fetches an User from the database
 * @param email E-mail of the user to be fetched
 * @param relations List of relations which the returned User object should have filled in. These are fetched from the database aswell.
 * @returns A filled in User object with all relations specified populated if a user with the email 'email' exists, undefined otherwise
 */
export async function getUserByEmail(email: string, relations?: userRelations[]): Promise<User | undefined> {

    const connection = await getConnection();

    const returnedUser = await connection.getRepository(User).findOne({ where: { email: email }, relations: relations });

    return returnedUser;
}

/**
 * Saves a User in the databases
 * @param user User to be saved in the database
 * @returns A User object filled with user's fields.
 */
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

/**
 * Deletes a user from the database
 * @param username Username of the user to be deleted
 * @returns The deleted User object if a user with the username 'username' exists, undefined otherwise.
 */
export async function deleteUserByUsername(username: string): Promise<User | undefined> {

    const user = await getUserByUsername(username);

    if (!user) return undefined;

    const connection = await getConnection();

    await connection.getRepository(User).delete({ username: username });

    assert(await getUserByUsername(username) === undefined, 'deleteUserByUsername failed to delete.');
    return user;
}

/**
 * Fetches Game-Code from the db
 * @param objectID ObjectID-String of the Game-Code to be fetched
 * @returns The Code object fetched from the db, undefined if there is no Code with this id.
 */
export async function getGameCode(objectID: string): Promise<Code | undefined> {
    return getCodeFrom(new ObjectID(objectID), 'games');
}

async function setGameCode(code: Code): Promise<string> {
    return (await setCodeIn(code, 'games')).toHexString();
}

/**
 * Fetches Entry-Code from the db
 * @param objectID ObjectID-String of the Entry-Code to be fetched
 * @returns The Code object fetched from the db, undefined if there is no Code with this id.
 */
export async function getEntryCode(objectID: string): Promise<Code | undefined> {
    return getCodeFrom(new ObjectID(objectID), 'entries');
}

async function setEntryCode(code: Code): Promise<string> {
    return (await setCodeIn(code, 'entries')).toHexString();
}

/**
 * Saves a Game along with it's Webassembly code in the databases
 * @param game Game to be saved in the database
 * @param code Webassembly code which belongs to this game
 * @returns A Game object filled with game's fields and has the objectID for the code filled in
 */
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

/**
 * Fetches a Game along with associated relations from the database
 * @param name Name of the game to be fetched
 * @param relations List of relations which the returned Game object should have filled in. These are fetched from the database aswell.
 * @returns A filled in Game object with all relations specified populated if a game with name 'name' exists, undefined otherwise
 */
export async function getGame(name: string, relations?: gameRelations[]): Promise<Game | undefined> {
    const connection = await getConnection();

    const foundGame = await connection.getRepository(Game).findOne({ where: { name: name }, relations: relations });

    return foundGame;
}

/**
 * Deletes a game and it's associated Game-Code from the database
 * @param name Name of the game to be deleted
 * @returns The deleted Game object if a game with the name 'name' exists, undefined otherwise.
 */
export async function deleteGame(name: string): Promise<Game | undefined> {
    const connection = await getConnection();

    const foundGame = await connection.getRepository(Game).findOne(name);

    if (foundGame) {
        await connection.getRepository(Game).delete({ name: name });
        deleteCodeFrom(new ObjectID(foundGame.gameCodeID), "games");
    }

    return foundGame;
}

/**
 * Saves a GameEntry along with it's Webassembly code in the databases
 * @param entry GameEntry to be saved in the database
 * @param code Webassembly code which belongs to this GameEntry
 * @returns A GameEntry object filled with entry's fields and has the objectID for the code filled in
 */
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

/**
 * Fetches a GameEntry along with associated relations from the database
 * @param id Name of the GameEntry to be fetched
 * @param relations List of relations which the returned GameEntry object should have filled in. These are fetched from the database aswell.
 * @returns A filled in GameEntry object with all relations specified populated if an entry with id 'id' exists, undefined otherwise
 */
export async function getEntry(id: number, relations?: gameEntryRelations[]): Promise<GameEntry | undefined> {
    const connection = await getConnection();

    const foundEntry = await connection.getRepository(GameEntry).findOne({ where: { id: id }, relations: relations });

    return foundEntry;
}

/**
 * Deletes a GameEntry and it's associated Entry-Code from the database
 * @param id ID of the GameEntry to be deleted
 * @returns The deleted GameEntry object if an entry with the id 'id' exists, undefined otherwise.
 */
export async function deleteEntry(id: number): Promise<GameEntry | undefined> {
    const connection = await getConnection();

    const foundEntry = await connection.getRepository(GameEntry).findOne(id);

    if (foundEntry) {
        await connection.getRepository(GameEntry).delete({ id: id });
        deleteCodeFrom(new ObjectID(foundEntry.submittedCodeID), "entries");
    }

    return foundEntry;
}

async function setCodeIn(code: Code, collectionName: mongoCollection): Promise<ObjectID> {
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

async function getCodeFrom(objectID: ObjectID, collectionName: mongoCollection): Promise<Code | undefined> {
    const collection = await getCollection<Code>(collectionName);

    const code = await collection.findOne({ _id: objectID });

    if (!code) return undefined;

    //HACK: This is a disgusting fix to ensure that the code object which is returned will have the .equals function since Mongo does not do this...
    return new Code(code);
}

async function deleteCodeFrom(objectID: ObjectID, collectionName: mongoCollection): Promise<Code | undefined> {
    const collection = await getCollection<Code>(collectionName);

    const code = await collection.findOne({ _id: objectID });

    if (!code) return undefined;

    await collection.deleteOne({ _id: objectID });

    assert(await getCodeFrom(objectID, collectionName) === undefined, 'Code was still in Mongo after delete.')

    //HACK: This is a disgusting fix to ensure that the code object which is returned will have the .equals function since Mongo does not do this...
    return new Code(code);
}