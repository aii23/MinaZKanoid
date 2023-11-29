import { gameRecord } from '../src/GameHub';

/// 1 tick(no bricks) - 279 gates
/// 100 ticks(no bricks) - 4833 gates
/// 1000 ticks(no bricks) - 46233 gates

/// 1 tick(only one brick(only bricks collision)) - 488

/// 1 tick - 5162 gates
/// 10 ticks - 50694 gates
/// 100 ticks - 497235

describe('Circuit size check', () => {
    it('Circuit size check', async () => {
        console.log('Result');

        console.log(gameRecord.analyzeMethods()[0].gates.length);
    });
});
