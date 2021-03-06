import { InsertOneWriteOpResult, MongoClient, WithId } from 'mongodb';
import { User } from '../../types/user';

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/`;

export function getMongoClient(): MongoClient {
    return new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}

export async function getUserByUname(uname: string): Promise<User | null> {
    const mongoClient = getMongoClient();

    try {
        await mongoClient.connect();
        const collection = mongoClient.db('codearena').collection<User>('users');

        return await collection.findOne({ uname: uname });;
    } finally {
        await mongoClient.close();
    }
}

export async function createUser(user: User): Promise<InsertOneWriteOpResult<WithId<User>>> {
    const mongoClient = getMongoClient();

    try {
        await mongoClient.connect();
        const collection = mongoClient.db('codearena').collection<User>('users');

        return await collection.insertOne(user);
    } finally {
        await mongoClient.close();
    }
}