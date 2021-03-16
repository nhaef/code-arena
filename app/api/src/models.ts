import { Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class User {

    constructor(username: string, email: string, displayname: string, passwordHash: string, salt: string) {
        this.username = username;
        this.email = email;
        this.displayname = displayname;
        this.passwordHash = passwordHash;
        this.salt = salt;
        this.gameEntries = [];
    }

    @PrimaryColumn("text")
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
    public gameEntries: GameEntry[];
}

export function objIsUser(obj: any): obj is User {
    return obj
        && obj.displayname && typeof obj.displayname === 'string'
        && obj.username && typeof obj.username === 'string'
        && obj.email && typeof obj.email === 'string'
        && obj.passwordHash && typeof obj.passwordHash === 'string'
        && obj.salt && typeof obj.salt === 'string'
}

@Entity()
export class Game {
    
    constructor(name: string, gameCode: string) {
        this.name = name;
        this.gameCode = gameCode;
        this.entries = [];
    }

    @PrimaryColumn()
    public name: string;

    @Column()
    public gameCode: string;

    @OneToMany(type => GameEntry, GameEntry => GameEntry.game)
    public entries: GameEntry[];
}

@Entity()
export class GameEntry {

    constructor(submittedCode: string, submitter: User, game: Game) {
        this.submittedCode = submittedCode;
        this.submitter = submitter;
        this.game = game;
    }

    //TODO: This '!' makes the compiler believe id is always initialized, which is not the case. It does not have to be set when handed to typeorm due to being generated, this just stops strict ts from whining.
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column()
    public submittedCode: string;

    @ManyToOne(type => User, User => User.passwordHash)
    public submitter: User;

    @ManyToOne(type => Game, Game => Game.entries)
    public game: Game;
}