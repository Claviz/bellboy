import { promises as fs } from 'fs';

import { Job, JsonProcessor } from '../src';
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

it('reads root data from JSON file', async () => {
    const json = ['hello', 'world'];
    await fs.appendFile(filePath, JSON.stringify(json));
    const destination = new CustomDestination();
    const processor = new JsonProcessor({
        path: './',
        files: [filePath],
        jsonPath: '*',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'hello',
        'world',
    ]);
});

it('reads nested data from JSON file', async () => {
    const json = { fields: ['hello', 'world'] };
    await fs.appendFile(filePath, JSON.stringify(json));
    const destination = new CustomDestination();
    const processor = new JsonProcessor({
        path: './',
        files: [filePath],
        jsonPath: 'fields.*',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'hello',
        'world',
    ]);
});

it('respects rowLimit', async () => {
    const json = ['1', '2', '3', '4'];
    await fs.appendFile(filePath, JSON.stringify(json));
    const destination = new CustomDestination();
    const processor = new JsonProcessor({
        path: './',
        files: [filePath],
        jsonPath: '*',
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