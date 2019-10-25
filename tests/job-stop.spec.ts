import { DynamicProcessor, Job } from '../src';
import { CustomDestination, CustomErrorDestination, CustomErrorProcessor } from './helpers';

beforeAll(async () => {
});

beforeEach(async () => {
});

afterEach(async () => {
});

afterAll(async () => {
});

it.each([true, false])(`should stop correctly on rowGenerationError event with error - %s`, async (withError) => {
    const events: string[] = [];
    const destination = new CustomDestination({
        batchSize: 2,
        recordGenerator: async function* (row) {
            throw new Error('Row generation error.');
        },
        batchTransformer: async function (rows) {
            return rows;
        },
    });
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield `test${i}`;
            }
        },
    });
    const job = new Job(processor, [destination]);
    job.onAny(async (event: string) => {
        events.push(event);
    });
    job.on('rowGenerationError', async () => {
        withError ? job.stop('Some error') : job.stop();
    });
    let error: any;
    try {
        await job.run();
    } catch (err) {
        error = err;
    }
    expect(events).toMatchSnapshot();
    if (withError) {
        expect(error.message).toEqual('Some error');
    }
});

it.each([true, false])(`should stop correctly on transformingBatchError event with error - %s`, async (withError) => {
    const events: string[] = [];
    const destination = new CustomDestination({
        batchSize: 2,
        recordGenerator: async function* (row) {
            yield row;
        },
        batchTransformer: async function (rows) {
            throw new Error('Batch transformation error.');
        },
    });
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield `test${i}`;
            }
        },
    });
    const job = new Job(processor, [destination]);
    job.onAny(async (event: string) => {
        events.push(event);
    });
    job.on('transformingBatchError', async () => {
        withError ? job.stop('Some error') : job.stop();
    });
    let error: any;
    try {
        await job.run();
    } catch (err) {
        error = err;
    }
    expect(events).toMatchSnapshot();
    if (withError) {
        expect(error.message).toEqual('Some error');
    }
});

it.each([true, false])(`should stop correctly on loadingBatchError event with error - %s`, async (withError) => {
    const events: string[] = [];
    const destination = new CustomErrorDestination({
        batchSize: 2,
        recordGenerator: async function* (row) {
            yield row;
        },
        batchTransformer: async function (rows) {
            return rows;
        },
    });
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield `test${i}`;
            }
        },
    });
    const job = new Job(processor, [destination]);
    job.onAny(async (event: string) => {
        events.push(event);
    });
    job.on('loadingBatchError', async () => {
        withError ? job.stop('Some error') : job.stop();
    });
    let error: any;
    try {
        await job.run();
    } catch (err) {
        error = err;
    }
    expect(events).toMatchSnapshot();
    if (withError) {
        expect(error.message).toEqual('Some error');
    }
});

it.each([true, false])(`should stop correctly on processingError event with error - %s`, async (withError) => {
    const events: string[] = [];
    const destination = new CustomDestination({
        batchSize: 2,
        recordGenerator: async function* (row) {
            yield row;
        },
        batchTransformer: async function (rows) {
            return rows;
        },
    });
    const processor = new CustomErrorProcessor();
    const job = new Job(processor, [destination]);
    job.onAny(async (event: string) => {
        events.push(event);
    });
    job.on('processingError', async () => {
        withError ? job.stop('Some error') : job.stop();
    });
    let error: any;
    try {
        await job.run();
    } catch (err) {
        error = err;
    }
    expect(events).toMatchSnapshot();
    if (withError) {
        expect(error.message).toEqual('Some error');
    }
});

describe(`should stop correctly on successfull events`, () => {
    let job: Job;
    let destination: CustomDestination;
    let events: string[] = [];

    beforeEach(() => {
        events = [];
        destination = new CustomDestination({
            batchSize: 2,
            recordGenerator: async function* (row) {
                yield row;
            },
            batchTransformer: async function (rows) {
                return rows;
            },
        });
        const processor = new DynamicProcessor({
            generator: async function* () {
                for (let i = 0; i < 3; i++) {
                    yield `test${i}`;
                }
            },
        });
        job = new Job(processor, [destination]);
        job.onAny(async (event: string) => {
            events.push(event);
        });
    });

    describe.each([
        'startProcessing',
        'startProcessingStream',
        'startProcessingRow',
        'rowGenerated',
        'endProcessingRow',
        'transformingBatch',
        'transformedBatch',
        'endTransformingBatch',
        'loadingBatch',
        'loadedBatch',
        'endLoadingBatch',
        'endProcessingStream',
        'endProcessing',
    ])(`%s`, (eventName) => {
        it.each([true, false])(`with error - %s`, async (withError) => {
            job.on(eventName as any, async () => {
                withError ? job.stop('Some error') : job.stop();
            });
            let error: any;
            try {
                await job.run();
            } catch (err) {
                error = err;
            }
            expect(events).toMatchSnapshot();
            if (withError) {
                expect(error.message).toEqual('Some error');
            }
        });
    });
});