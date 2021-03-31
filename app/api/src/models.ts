import { ObjectID } from 'bson';
import { Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne } from 'typeorm';

@Entity()
export class User {

    constructor(username: string, email: string, displayname: string, passwordHash: string, salt: string) {
        this.username = username;
        this.email = email;
        this.displayname = displayname;
        this.passwordHash = passwordHash;
        this.salt = salt;
    }

    public equals(user: User | undefined | null) {
        if (!user) return false;

        return this.username === user.username &&
            this.email === user.email &&
            this.displayname === user.displayname &&
            this.passwordHash === user.passwordHash &&
            this.salt === user.salt;
    }

    @PrimaryColumn()
    public username: string;

    @Column()
    public email: string;

    @Column()
    public displayname: string;

    @Column()
    public passwordHash: string;

    @Column()
    public salt: string;

    @OneToMany(type => GameEntry, GameEntry => GameEntry.submitter)
    public gameEntries!: GameEntry[];
}

@Entity()
export class Game {

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    public equals(game: Game | undefined | null | void): boolean {

        if (!game) return false;

        return this.name === game.name &&
            this.description === game.description;
    }

    @PrimaryColumn()
    public name: string;

    @Column()
    public description: string;

    @Column()
    public gameCodeID!: string;

    @OneToMany(type => GameEntry, GameEntry => GameEntry.game)
    public entries!: GameEntry[];
}

@Entity()
export class GameEntry {

    constructor(submitter: User, game: Game) {
        this.submitter = submitter;
        this.game = game;
    }

    //TODO: This '!' makes the compiler believe id is always initialized, which is not the case. It may not be set when handed to typeorm due to being generated, this just stops strict ts from crying.
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column()
    public submittedCodeID!: string;

    @ManyToOne(type => User, User => User.gameEntries, { onDelete: 'SET NULL' })
    public submitter!: User;

    @ManyToOne(type => Game, Game => Game.entries, { onDelete: 'CASCADE' })
    public game!: Game;

    public equals(other: GameEntry | null | undefined | void): boolean {
        if (!other) return false;

        return this.id === other.id &&
            this.submittedCodeID === other.submittedCodeID;
    }
}

// Stored in MongoDB
export class Code {
    constructor(code: string);
    constructor(code: Code);
    constructor(code: string | Code) {
        if (typeof code === 'string') this.code = code;
        else {
            this.code = code.code;
            this._id = code._id;
        }
    }

    public equals(code: Code): boolean {
        return this.code === code.code &&
            this._id.equals(code._id);
    }

    public code: string

    public _id!: ObjectID;
}