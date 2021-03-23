import { ObjectID } from "bson";
import { createGame, createUser, deleteGame, deleteUserByUname, getGame, getUserByUname, getGameCode } from "./db";
import { Code, Game, User } from "./models";

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error("Assertion error: " + msg);
    }
}

export async function test() {

    await deleteUserByUname("BSC");

    //TEST USER
    const user = new User("BSC", "testmail@mail.com", "BloodStainedCrow", "wagdgwudg", "asfdazwgzw");

    const createdUser = await createUser(user);

    assert(createdUser, "User was not created.");
    assert(createdUser.equals(user), "Inserted user unequal user.");

    const secondUserTemplate = new User("BSC", "differentTestmail@mail.com", "BldStndCrw", "ifuha", "ajsdkb");

    const secondUser = await createUser(secondUserTemplate);

    assert(secondUser === null, "second user was inserted even though their username was already in use");

    const deletedUser = await deleteUserByUname(user.username);

    assert(deletedUser, "User wich was deleted was not as expected, but falsy");
    assert(deletedUser.equals(user), "User wich was deleted was not as expected, but unequal to user");

    assert(await getUserByUname("BSC").catch((reason) => {
        console.log(reason);
    }) === undefined, "after user deletion user was still in the db");

    //TEST GAME

    await deleteGame("TicTacToe");

    const game = new Game("TicTacToe", "A turn based game with the goal of creating a row of 3 identical symbols.")
    const code = new Code("console.log('test123');")

    await createGame(game, code).catch((reason) => {
       console.log(reason);
    });

    assert(game.equals(await getGame("TicTacToe").catch((reason) => {
        console.log(reason);
    })), "inserted Game not equal to game wanting to be inserted.");

    const savedGame = await getGame("TicTacToe");

    assert(savedGame);

    const gameCode = await getGameCode(savedGame.gameCodeID);

    assert(gameCode);
    assert(gameCode.equals(code), "saved Game code did not match code in mongodb");

    const secondGameTemplate = new Game("TicTacToe", "lul");

    //creating game with same name, should fail.
    const secondGame = await createGame(secondGameTemplate, code).catch((reason) => {
        //This should throw an Error since TicTacToe is already in use
        return null;
    });

    assert(secondGame === null, "Second game was inserted even though their names were identical");

    const deletedGame = await deleteGame(game.name).catch((reason) => {
        console.log(reason);
    });

    assert(deletedGame, "game wich was deleted was not as expected, but falsy");
    assert(deletedGame.equals(game), "game wich was deleted was not as expected, but unequal to game");

    assert(await getGame("TicTacToe").catch((reason) => {
        console.log(reason);
    }) === undefined, "after game deletion game was still in the db");
}