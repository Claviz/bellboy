import * as fs from 'fs';

import { DelimitedProcessor, Job } from '../src';
import { CustomDestination } from './helpers';

const filePath = 'test.txt';

beforeAll(async () => {
});

beforeEach(async () => {
});

afterEach(async () => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
});

afterAll(async () => {
});

it('reads data from file delimited by new lines', async () => {
    fs.appendFileSync(filePath, 'First line\n');
    fs.appendFileSync(filePath, 'Second line\n');
    const destination = new CustomDestination({
        rowLimit: 2,
    });
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        delimiter: '\n',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'First line',
        'Second line',
    ]);
});

it('reads data from file delimited by commas', async () => {
    fs.appendFileSync(filePath, 'Hello, world!');
    const destination = new CustomDestination({
        rowLimit: 2,
    });
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        delimiter: ',',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'Hello',
        ' world!',
    ]);
});