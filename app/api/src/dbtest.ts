import { createGame, deleteGame, getGame } from "./db";
import { Code, Game } from "./models";

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error("Assertion error: " + msg);
    }
}

export async function test() {

    const game = new Game("TicTacToe", "A turn based game with the goal of creating a row of 3 identical symbols.")
    const code = new Code("console.log('test123');")

    await createGame(game, code).catch((reason) => {
       console.log(reason);
    });

    assert(game.equals(await getGame("TicTacToe").catch((reason) => {
        console.log(reason);
    })), "inserted Game not equal to game wanting to be inserted.");

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