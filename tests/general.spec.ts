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
    const destination = new CustomDestination();
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 10; i++) {
                yield `test${i}`;
            }
        },
        rowLimit: 3,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'test0',
        'test1',
        'test2',
    ]);
});

it(`destination should respsect row limit even if it is less than batchSize`, async () => {
    const data: any[] = [];
    const destination = new CustomDestination({
        batchSize: 10,
    });
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 100; i++) {
                yield `test${i}`;
            }
        },
        rowLimit: 3,
    });
    const job = new Job(processor, [destination], {
        previewMode: true,
    });
    job.on('startProcessingRow', async (row) => {
        data.push(row);
    });
    await job.run();
    expect(data.length).toEqual(3);
});
