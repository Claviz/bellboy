import * as fs from 'fs';

import { JsonProcessor, Job } from '../src';
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

it('reads root data from JSON file', async () => {
    const json = ['hello', 'world'];
    fs.appendFileSync(filePath, JSON.stringify(json));
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
    fs.appendFileSync(filePath, JSON.stringify(json));
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