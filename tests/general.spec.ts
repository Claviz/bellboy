import { DynamicProcessor, Job } from '../src';
import { CustomDestination } from './helpers';

beforeAll(async () => {
});

beforeEach(async () => {
});

afterEach(async () => {
});

afterAll(async () => {
});

it('destination should stop loading when rowLimit is specified and reached', async () => {
    const destination = new CustomDestination({
        rowLimit: 3,
    });
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 10; i++) {
                yield `test${i}`;
            }
        }
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'test0',
        'test1',
        'test2',
    ]);
});
