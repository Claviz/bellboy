import { promises as fs } from 'fs';

import { DelimitedProcessor, Job } from '../src';
import { CustomDestination } from './helpers';

const filePath = 'test.txt';

beforeAll(async () => {
});

beforeEach(async () => {
});

afterEach(async () => {
    await fs.unlink(filePath);
});

afterAll(async () => {
});

it('reads data from file delimited by new lines', async () => {
    await fs.appendFile(filePath, 'First line\n');
    await fs.appendFile(filePath, 'Second line\n');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        delimiter: '\n',
        rowLimit: 2,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'First line',
        'Second line',
    ]);
});

it('reads data from file delimited by commas', async () => {
    await fs.appendFile(filePath, 'Hello, world!');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        delimiter: ',',
        rowLimit: 2,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'Hello',
        ' world!',
    ]);
});

it('respects rowLimit', async () => {
    await fs.appendFile(filePath, '1\n');
    await fs.appendFile(filePath, '2\n');
    await fs.appendFile(filePath, '3\n');
    await fs.appendFile(filePath, '4\n');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        delimiter: '\n',
        rowLimit: 3,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        '1',
        '2',
        '3',
    ]);
});