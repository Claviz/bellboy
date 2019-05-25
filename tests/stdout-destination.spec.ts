import { DynamicProcessor, Job, StdoutDestination } from '../src';

let stdoutData: any[] = [];

beforeAll(async () => {
});

beforeEach(async () => {
    stdoutData = [];
});

afterAll(async () => {
});

it('prints processed data to a stdout', async () => {
    console['log'] = jest.fn(x => {
        stdoutData.push(...x);
    });
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield {
                    text: 'something'
                }
            }
        },
    });
    const destination = new StdoutDestination();
    const job = new Job(processor, [destination]);
    await job.run();
    expect(stdoutData).toEqual([{
        text: 'something'
    }, {
        text: 'something'
    }, {
        text: 'something'
    }]);
});

it('prints processed data to a stdout as a table', async () => {
    console['table'] = jest.fn(x => {
        stdoutData.push(...x);
    });
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield {
                    text: 'something'
                }
            }
        },
    });
    const destination = new StdoutDestination({
        asTable: true,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(stdoutData).toEqual([{
        text: 'something'
    }, {
        text: 'something'
    }, {
        text: 'something'
    }]);
});
