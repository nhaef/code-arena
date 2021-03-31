import { ObjectID } from 'bson';
import { createGame, createUser, deleteGame, deleteUserByUsername, getGame, getUserByUsername, getGameCode, createEntry, getEntry, deleteEntry } from './../db';
import { Code, Game, GameEntry, User } from './../models';

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error('Assertion error: ' + msg);
    }
}

export async function test() {

    await deleteUserByUsername('BSC').catch((reason) => {
        throw reason;
    });

    assert(await getUserByUsername('BSC').catch((reason) => {
        throw reason;
    }) === undefined, 'BSC was still in db after delete')

    //TEST USER
    const user = new User('BSC', 'testmail@mail.com', 'BloodStainedCrow', 'wagdgwudg', 'asfdazwgzw');

    const createdUser = await createUser(user).catch(() => {
        console.log('Unexpected Error in create User.');

        return undefined;
    });

    assert(createdUser, 'User was not created.');
    assert(createdUser.equals(user), 'Inserted user unequal user.');

    const secondUserTemplate = new User('BSC', 'differentTestmail@mail.com', 'BldStndCrw', 'ifuha', 'ajsdkb');

    const secondUser = await createUser(secondUserTemplate).catch(() => {
        return undefined;
    });

    assert(secondUser === undefined, 'second user was inserted even though their username was already in use');

    const deletedUser = await deleteUserByUsername(user.username).catch((reason) => {
        console.log(reason);
    });

    assert(deletedUser, 'User wich was deleted was not as expected, but falsy');
    assert(deletedUser.equals(user), 'User wich was deleted was not as expected, but unequal to user');

    assert(await getUserByUsername('BSC').catch((reason) => {
        console.log(reason);
    }) === undefined, 'after user deletion user was still in the db');

    //TEST GAME

    await deleteGame('TicTacToe');

    const game = new Game('TicTacToe', 'A turn based game with the goal of creating a row of 3 identical symbols.')
    const code = new Code('console.log("test123");')

    await createGame(game, code).catch((reason) => {
        console.log(reason);
    });

    assert(game.equals(await getGame('TicTacToe').catch((reason) => {
        console.log(reason);
    })), 'inserted Game not equal to game wanting to be inserted.');

    const savedGame = await getGame('TicTacToe');

    assert(savedGame);

    const gameCode = await getGameCode(savedGame.gameCodeID);

    assert(gameCode);
    assert(gameCode.equals(code), 'saved Game code did not match code in mongodb');

    const secondGameTemplate = new Game('TicTacToe', 'lul');

    //creating game with same name, should fail.
    const secondGame = await createGame(secondGameTemplate, code).catch((reason) => {
        //This should throw an Error since TicTacToe is already in use
        return undefined;
    });

    assert(secondGame === undefined, 'Second game was inserted even though their names were identical');

    const deletedGame = await deleteGame(game.name).catch((reason) => {
        console.log(reason);
    });

    assert(deletedGame, 'game wich was deleted was not as expected, but falsy');
    assert(deletedGame.equals(game), 'game wich was deleted was not as expected, but unequal to game');

    assert(await getGame('TicTacToe').catch((reason) => {
        console.log(reason);
    }) === undefined, 'after game deletion game was still in the db');


    await testGameEntry().catch(reason => {
        throw reason;
    });


    console.log('All database tests solved successfully');
}

async function testGameEntry() {

    const user = new User('EntryTestUser', 'testmail@mail.com', 'BloodStainedCrow', 'start.ts', 'asfdazwgzw');

    const game = new Game('EntryTestGame', 'A turn based game with the goal of creating a row of 3 identical symbols. start.ts');
    const code = new Code('console.log("test123");');

    const createdGame = await createGame(game, code).catch(async (reason) => {
        return await getGame(game.name).catch((reason) => {
            console.log(reason);
            throw reason;
        });
    });
    assert(createdGame, 'Game not created');

    const createdUser = await createUser(user).catch(async (reason) => {
        return await getUserByUsername(user.username).catch((reason) => {
            console.log(reason);
            throw reason;
        });
    });
    assert(createdUser, 'User not created.');

    const foundUser = await getUserByUsername('EntryTestUser').catch((reason) => {
        console.log(reason);
        throw reason;
    });
    assert(foundUser, 'User not in db');

    const foundGame = await getGame('EntryTestGame').catch((reason) => {
        console.log(reason);
        throw reason;
    });
    assert(foundGame, 'Game not in db');


    const entry: GameEntry = new GameEntry(user, game);
    const createdEntry = await createEntry(entry, code).catch(reason => {
        console.log(reason);
        throw reason;
    });
    assert(createdEntry, 'Entry not created.');

    const foundEntry = await getEntry(createdEntry.id, ['game', 'submitter']).catch(reason => {
        console.log(reason);
        throw reason;
    });
    assert(foundEntry, 'Entry not in db');
    assert(foundEntry.game, 'game not initialized.');
    assert(foundEntry.submitter, 'submitter not initialized');

    const logGame = await getGame('EntryTestGame', ['entries']).catch(reason => {
        console.log(reason);
        throw reason;
    });

    assert(logGame, 'Game not in db');
    assert(logGame.entries, 'entries not initialized.');
    //assert that the entry is inside logGame.entries
    assert(logGame.entries.some(e => e.equals(entry)), 'entry is not in logGame.entries');

    const logUser = await getUserByUsername('EntryTestUser', ['gameEntries']).catch(reason => {
        console.log(reason);
        throw reason;
    });

    assert(logUser, 'user not in db');
    assert(logUser.gameEntries, 'gameEntries not initialized.');
    //assert that the entry is inside logUser.logUser
    assert(logUser.gameEntries.some(e => e.equals(entry)), 'entry is not in logUser.gameEntries');

    const deletedEntry = deleteEntry(foundEntry.id).catch(reason => {
        console.log(reason);
        throw reason;
    });
    assert(deletedEntry, 'deleteduser was unexpectedly falsy.');
    assert(await getEntry(foundEntry.id) === undefined, 'entry was still in db after delete.');
}