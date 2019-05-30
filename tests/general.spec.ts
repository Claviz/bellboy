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

it('destination should load everything if rowLimit is 0', async () => {
    const destination = new CustomDestination();
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 33; i++) {
                yield `test${i}`;
            }
        },
        rowLimit: 0,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData().length).toEqual(33);
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
    const job = new Job(processor, [destination]);
    job.on('startProcessingRow', async (row) => {
        data.push(row);
    });
    await job.run();
    expect(data.length).toEqual(3);
});

it(`destination should be able to generate new rows`, async () => {
    const destination = new CustomDestination({
        recordGenerator: async function* (row) {
            for (let i = 0; i < 3; i++) {
                yield `test${i} generated`;
            }
        }
    });
    const processor = new DynamicProcessor({
        generator: async function* () {
            yield `Hello, world!`;
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'test0 generated',
        'test1 generated',
        'test2 generated',
    ]);
});

it(`destination shouldn't load if destination load is disabled`, async () => {
    const destination = new CustomDestination({
        disableLoad: true,
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
    expect(destination.getData()).toEqual([]);
});

it(`destination should load if destination load isn't disabled`, async () => {
    const destination = new CustomDestination({
        disableLoad: false,
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
    expect(destination.getData().length).toEqual(10);
});