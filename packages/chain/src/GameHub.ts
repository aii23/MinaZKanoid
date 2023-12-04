import {
    RuntimeModule,
    runtimeModule,
    state,
    runtimeMethod,
} from '@proto-kit/module';
import { State, StateMap } from '@proto-kit/protocol';
import {
    Experimental,
    PublicKey,
    Field,
    UInt64,
    Struct,
    Provable,
    Int64,
    Bool,
} from 'o1js';

export class GameRecordKey extends Struct({
    seed: UInt64,
    player: PublicKey,
}) {}

export class Point extends Struct({
    x: UInt64,
    y: UInt64,
}) {
    static from(_x: number, _y: number): Point {
        return new Point({
            x: new UInt64(_x),
            y: new UInt64(_y),
        });
    }

    add(p: Point): Point {
        return new Point({
            x: this.x.add(p.x),
            y: this.y.add(p.y),
        });
    }
}

export const INITIAL_SCORE = 99999;
export const SCORE_PER_TICKS = 1;
export const MAX_BRICKS = 1;

export const BRICK_HALF_WIDTH = 25;
export const FIELD_PIXEL_WIDTH = 500;
export const FIELD_PIXEL_HEIGHT = 500;
export const PLATFORM_HALF_WIDTH = 50;

export const GAME_LENGTH = 1;

export class Tick extends Struct({
    action: UInt64,
}) {}

export class GameInputs extends Struct({
    tiks: Provable.Array(Tick, GAME_LENGTH),
}) {}

class MapGenerationPublicOutput extends Struct({}) {}

export function checkMapGeneration(
    seed: Field,
    bricks: Bricks
): MapGenerationPublicOutput {
    return new MapGenerationPublicOutput({});
}

export class GameRecordPublicOutput extends Struct({
    score: UInt64,
}) {}

/////////////////////////////////// Game logic structs //////////////////////////////////

export class IntPoint extends Struct({
    x: Int64,
    y: Int64,
}) {
    static from(_x: number, _y: number): IntPoint {
        return new IntPoint({
            x: Int64.from(_x),
            y: Int64.from(_y),
        });
    }
}

export class Brick extends Struct({
    pos: IntPoint, //
    value: UInt64,
}) {}

export class Bricks extends Struct({
    bricks: Provable.Array(Brick, MAX_BRICKS),
}) {}

class Ball extends Struct({
    position: IntPoint,
    speed: IntPoint,
}) {
    move(): void {
        this.position.x = this.position.x.add(this.speed.x);
        this.position.y = this.position.y.add(this.speed.y);
    }
}

class Platform extends Struct({
    position: Int64,
}) {}

////////////////////////////////// Game logic structs end ////////////////////////////////

const DEFAULT_BALL_LOCATION = IntPoint.from(100, 100);
const DEFAULT_BALL_SPEED = IntPoint.from(1, 1);
const DEFAULT_PLATFORM_LOCATION = Int64.from(100);

export class GameContext extends Struct({
    bricks: Bricks,
    totalLeft: UInt64,
    ball: Ball,
    platform: Platform,
    score: UInt64,
    winable: Bool,
    alreadyWon: Bool,
}) {
    processTick(tick: Tick): void {
        /*
        // 1) Update score
        this.score = Provable.if(
            this.alreadyWon,
            this.score,
            this.score.sub(SCORE_PER_TICKS)
        );

        /// 2) Update platform position
        this.platform.position = this.platform.position.add(1).sub(tick.action);
        */

        // /// 3) Update ball position
        const prevBallPos = new IntPoint({
            x: this.ball.position.x,
            y: this.ball.position.y,
        });

        this.ball.move();

        /*

        /// 4) Check for edge bumps

        const leftBump = this.ball.position.x.isPositive().not();
        const rightBump = this.ball.position.x
            .sub(FIELD_PIXEL_WIDTH)
            .isPositive();
        const topBump = this.ball.position.y
            .sub(FIELD_PIXEL_HEIGHT)
            .isPositive();
        const bottomBump = this.ball.position.y.isPositive().not();

        /// Add come constrains just in case

        // If bumf - just return it and change speed
        this.ball.position.x = Provable.if(
            leftBump,
            Int64.from(0),
            this.ball.position.x
        );
        this.ball.position.x = Provable.if(
            rightBump,
            Int64.from(FIELD_PIXEL_WIDTH),
            this.ball.position.x
        );

        this.ball.speed.x = Provable.if(
            leftBump.or(rightBump),
            this.ball.speed.x.neg(),
            this.ball.speed.x
        );

        this.ball.position.y = Provable.if(
            topBump,
            Int64.from(FIELD_PIXEL_HEIGHT),
            this.ball.position.y
        );
        this.ball.position.y = Provable.if(
            bottomBump,
            Int64.from(0),
            this.ball.position.y
        );

        this.ball.speed.y = Provable.if(
            topBump.or(bottomBump),
            this.ball.speed.y.neg(),
            this.ball.speed.y
        );

        /// 5) Check platform bump
        let isFail = bottomBump.and(
            /// Too left from the platform
            this.ball.position.x
                .sub(this.platform.position.sub(PLATFORM_HALF_WIDTH))
                .isPositive()
                .not()
                .or(
                    // Too right from the platform
                    this.ball.position.x
                        .sub(this.platform.position.add(PLATFORM_HALF_WIDTH))
                        .isPositive()
                )
        );

        this.winable = this.winable.and(isFail.not());

        */

        //6) Check bricks bump

        for (let j = 0; j < MAX_BRICKS; j++) {
            // 461c
            const currentBrick = this.bricks.bricks[j];
            let isAlive = currentBrick.value.greaterThan(UInt64.from(1)); // 19c | 1 just so UInt64.sub do not underflow
            let leftBorder = currentBrick.pos.x.sub(BRICK_HALF_WIDTH); // 6c
            let rightBorder = currentBrick.pos.x.add(BRICK_HALF_WIDTH); // 6c
            let topBorder = currentBrick.pos.y.add(BRICK_HALF_WIDTH); // 6c
            let bottomBorder = currentBrick.pos.y.sub(BRICK_HALF_WIDTH); // 6c
            // 70 c by this point(1 brick 1 tick)
            /*
            Collision
                ball.pos.x \inc [leftBorder, rightBorder]
                ball.pos.y \inc [bottomBorder, topBorder]

            */
            const horizontalCollision = rightBorder
                .sub(this.ball.position.x)
                .isPositive()
                .and(this.ball.position.x.sub(leftBorder).isPositive()); // 18c
            const verticalCollision = topBorder
                .sub(this.ball.position.y)
                .isPositive()
                .and(this.ball.position.y.sub(bottomBorder).isPositive()); // 17c (1 less then previous???)
            const collisionHappen = isAlive.and(
                horizontalCollision.and(verticalCollision)
            ); // 1c
            // 106 c by this point(1 brick 1 tick)
            /*
                Detect where collision ocured
                /////////////// vertical part of a brick //////////////////////////
                y = d
                ay = bx + c;
                c = ay1 - bx1
                    // a - ball.speed.x
                    // b - ball.speed.y
                bx = ay - c
                bx = ad - c;

                x \incl [ brick.pos.x - BRICK_HALF_WIDTH, brick.pos.x + BRICK_HALF_WIDTH ]
                bx \incl [b(brics.pos.x - BRICK_HALF_WIDTH, b(brick.pos.x + BRICK_HALF_WIDTH))]
                ad - c \incl [b(brics.pos.x - BRICK_HALF_WIDTH, b(brick.pos.x + BRICK_HALF_WIDTH))]

                /////////////// horizontal part of a brick ////////////////////////////
                x = d
                ay = bx + c
                c = ay1 - bx1
                    a - ball.speed.x
                    b - ball.speed.y
                ay = bd + c

                y \incl [ brick.pos.y - BRICK_HALF_WIDTH, brick.pos.y + BRICK_HALF_WIDTH]
                ay \incl [ a(brick.pos.y - BRICK_HALF_WIDTH), a(brick.pos.y + BRICK_HALF_WIDTH)]
                bd + c \incl [ a(brick.pos.y - BRICK_HALF_WIDTH), a(brick.pos.y + BRICK_HALF_WIDTH)]
            */
            let a = this.ball.speed.x;
            let b = this.ball.speed.y;

            // let bMulLeftBorder = b.mul(leftBorder);
            // let bMulRightBorder = b.mul(rightBorder);

            /// b(brics.pos.x - BRICK_HALF_WIDTH)
            let leftEnd = b.mul(this.ball.position.x.sub(BRICK_HALF_WIDTH));
            let rightEnd = b.mul(this.ball.position.x.add(BRICK_HALF_WIDTH));

            let c = a
                .mul(this.ball.position.y)
                .sub(b.mul(this.ball.position.x));
            // Top horizontal
            let d1 = topBorder;
            let adc1 = a.mul(d1).sub(c);
            let adc1Sign = adc1.div(adc1.magnitude);
            let crossBrickTop = adc1
                .sub(leftEnd)
                .mul(adc1Sign)
                .isPositive()
                .and(rightEnd.sub(adc1).mul(adc1Sign).isPositive());
            let hasTopBump = crossBrickTop.and(
                prevBallPos.y.sub(topBorder).isPositive()
            ); // All 91c
            // 197c by this point

            // // Bottom horisontal
            let d2 = bottomBorder;
            let adc2 = a.mul(d2).sub(c);
            let adc2Sign = adc2.div(adc2.magnitude);
            let crossBrickBottom = adc2
                .sub(leftEnd)
                .mul(adc2Sign)
                .isPositive()
                .and(rightEnd.sub(adc2).mul(adc2Sign).isPositive());
            let hasBottomBump = crossBrickBottom.and(
                bottomBorder.sub(prevBallPos.y).isPositive()
            ); // All 90c
            // 287 by this point

            let topEnd = a.mul(this.ball.position.y.add(BRICK_HALF_WIDTH));
            let bottomEnd = a.mul(this.ball.position.y.sub(BRICK_HALF_WIDTH));

            // let aMulBottomBorder = a.mul(bottomBorder);
            // Left vertical
            let d3 = leftBorder;
            let bdc1 = b.mul(d3).add(c);
            let bdc1Sign = bdc1.div(bdc1.magnitude);
            let crossBrickLeft = a
                .mul(topEnd)
                .sub(bdc1)
                .mul(bdc1Sign)
                .isPositive()
                .and(bdc1.sub(bottomEnd).mul(bdc1Sign).isPositive());
            let hasLeftBump = crossBrickLeft.and(
                leftBorder.sub(prevBallPos.x).isPositive()
            ); // All 91c
            // 378 by this point

            // Right vertical
            let d4 = rightBorder;
            let bdc2 = b.mul(d4).add(c);
            let bdc2Sign = bdc2.div(bdc2.magnitude);
            let crossBrickRight = a
                .mul(topEnd)
                .sub(bdc2)
                .mul(bdc2Sign)
                .isPositive()
                .and(bdc2.sub(bottomEnd.mul(bdc2Sign)).isPositive());
            let hasRightBump = crossBrickRight.and(
                prevBallPos.x.sub(rightBorder).isPositive()
            ); // All 90c
            // 468 By this point

            // // Reduce health if coliision happend and brick is not dead
            currentBrick.value = Provable.if(
                collisionHappen,
                currentBrick.value.sub(1),
                currentBrick.value
            );
            this.totalLeft = Provable.if(
                collisionHappen,
                this.totalLeft.sub(1),
                this.totalLeft
            );
            this.alreadyWon = Provable.if(
                this.totalLeft.equals(UInt64.from(1)),
                Bool(true),
                this.alreadyWon
            );
            this.ball.speed.x = Provable.if(
                collisionHappen.and(hasLeftBump.or(hasRightBump)),
                this.ball.speed.x.neg(),
                this.ball.speed.x
            );
            this.ball.speed.y = Provable.if(
                collisionHappen.and(hasBottomBump.or(hasTopBump)),
                this.ball.speed.y.neg(),
                this.ball.speed.y
            ); // 20 for 5 if blocks
            // 488 by this point
        }
    }
}

export function checkGameRecord(
    // publicInput: Bricks
    bricks: Bricks,
    gameInputs: GameInputs
): GameRecordPublicOutput {
    let score = UInt64.from(INITIAL_SCORE);
    let ball = new Ball({
        position: DEFAULT_BALL_LOCATION,
        speed: DEFAULT_BALL_SPEED,
    });
    let platform = new Platform({
        position: DEFAULT_PLATFORM_LOCATION,
    });

    let totalLeft = UInt64.from(1); // Again 1 == 0

    for (let i = 0; i < bricks.bricks.length; i++) {
        totalLeft = totalLeft.add(bricks.bricks[i].value.sub(1)); // Sub(1), because 1 = 0. (Workaround UInt64.sub(1))
    }

    const gameContext = new GameContext({
        bricks,
        totalLeft,
        ball,
        platform,
        score,
        winable: new Bool(true),
        alreadyWon: new Bool(false),
    });

    for (let i = 0; i < gameInputs.tiks.length; i++) {
        gameContext.processTick(gameInputs.tiks[i]);
    }

    gameContext.winable.assertTrue();

    for (let i = 0; i < gameContext.bricks.bricks.length; i++) {
        /// Check that all bricks is destroyed
        gameContext.bricks.bricks[i].value.assertEquals(UInt64.from(1));
    }

    return new GameRecordPublicOutput({ score: gameContext.score });
}

export const gameRecord = Experimental.ZkProgram({
    publicOutput: GameRecordPublicOutput,
    methods: {
        checkGameRecord: {
            // privateInputs: [],
            privateInputs: [Bricks, GameInputs],
            method: checkGameRecord,
        },
    },
});

export class GameRecordProof extends Experimental.ZkProgram.Proof(gameRecord) {}

@runtimeModule()
export class GameHub extends RuntimeModule<unknown> {
    /// Seed + User => Record
    @state() public gameRecords = StateMap.from<GameRecordKey, UInt64>(
        GameRecordKey,
        UInt64
    );
    @state() public seeds = StateMap.from<UInt64, UInt64>(UInt64, UInt64);
    @state() public lastSeed = State.from<UInt64>(UInt64);
    @state() public lastUpdate = State.from<UInt64>(UInt64);

    @runtimeMethod()
    public updateSeed(seed: UInt64): void {
        const lastSeedIndex = this.lastSeed.get().orElse(UInt64.from(0));
        this.seeds.set(lastSeedIndex, seed);
        this.lastSeed.set(lastSeedIndex.add(1));
    }

    @runtimeMethod()
    public addGameResult(gameRecordProof: GameRecordProof): void {
        gameRecordProof.verify();

        const gameKey = new GameRecordKey({
            seed: this.seeds.get(this.lastSeed.get().value).value,
            player: this.transaction.sender,
        });

        const currentScore = this.gameRecords.get(gameKey).value;
        const newScore = gameRecordProof.publicOutput.score;

        if (currentScore < newScore) {
            this.gameRecords.set(gameKey, newScore);
        }
    }
}
