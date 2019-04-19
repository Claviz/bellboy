import * as fs from 'fs';

import * as bellboy from '../src';
import { Destination } from '../src/types';

let data: any[] = [];

const filePath = 'test.txt';
let interval: any;

beforeAll(async () => {

});

beforeEach(async () => {
    data = [];
    fs.appendFileSync(filePath, 'First line\n');
    fs.appendFileSync(filePath, 'Second line\n');
    interval = setInterval(function () {
        fs.appendFileSync(filePath, 'Hello, world!\n');
    }, 1000);
});

afterEach(async () => {
    clearInterval(interval);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
});

afterAll(async () => {

});

it('tails file', async () => {
    const processor = new bellboy.TailProcessor({
        path: './',
        files: [filePath],
        destinations: [
            {
                type: 'custom',
                batchSize: 1,
                load: async (rows) => {
                    data = rows;
                }
            } as Destination
        ],
    });
    processor.on('loadedBatch', async () => {
        return true;
    });
    await processor.process();
    expect(data).toEqual([{ file: filePath, data: 'Hello, world!' }]);
});

it('tails file from beginning', async () => {
    const processor = new bellboy.TailProcessor({
        path: './',
        files: [filePath],
        fromBeginning: true,
        destinations: [
            {
                type: 'custom',
                batchSize: 3,
                load: async (rows) => {
                    data = rows;
                }
            } as Destination
        ],
    });
    processor.on('loadedBatch', async () => {
        return true;
    });
    await processor.process();
    expect(data).toEqual([
        { file: filePath, data: 'First line' },
        { file: filePath, data: 'Second line' },
        { file: filePath, data: 'Hello, world!' },
    ]);
});

