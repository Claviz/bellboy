import * as fs from 'fs';

import { Job, ExcelProcessor } from '../src';
import { CustomDestination } from './helpers';

const xlsx = require('node-xlsx');
const filePath = 'test.xlsx';

beforeAll(async () => {
});

beforeEach(async () => {
});

afterAll(async () => {
});

afterEach(async () => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
});


it('parses xlsx without header', async () => {
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['hello', 'world']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new ExcelProcessor({
        hasHeader: false,
        path: './',
        files: [filePath],
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toMatchSnapshot();
});

it('parses xlsx with header', async () => {
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['column1', 'column2'], ['hello', 'world']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new ExcelProcessor({
        hasHeader: true,
        path: './',
        files: [filePath],
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toMatchSnapshot();
});

it('parses all xlsx files by pattern', async () => {
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['test']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new ExcelProcessor({
        hasHeader: false,
        path: './',
        filePattern: `.*\.(xlsx)`,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toMatchSnapshot();
});

it('parses specific sheet by name', async () => {
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['test1']],
    }, {
        name: 'sheet2',
        data: [['test2']],
    }, {
        name: 'sheet3',
        data: [['test3']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new ExcelProcessor({
        hasHeader: false,
        path: './',
        files: [filePath],
        sheets: ['sheet2'],
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toMatchSnapshot();
});

it('parses specific sheet by index', async () => {
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['test1']],
    }, {
        name: 'sheet2',
        data: [['test2']],
    }, {
        name: 'sheet3',
        data: [['test3']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new ExcelProcessor({
        hasHeader: false,
        path: './',
        files: [filePath],
        sheets: [2],
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toMatchSnapshot();
});

it('parses specific sheet by function', async () => {
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['test1']],
    }, {
        name: 'sheet2',
        data: [['test2']],
    }, {
        name: 'sheet3',
        data: [['test3']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new ExcelProcessor({
        hasHeader: false,
        path: './',
        files: [filePath],
        sheets: async function (sheets) {
            return [sheets[sheets.length - 1]];
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toMatchSnapshot();
});

it('parses multiple sheets', async () => {
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['test1']],
    }, {
        name: 'sheet2',
        data: [['test2']],
    }, {
        name: 'sheet3',
        data: [['test3']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new ExcelProcessor({
        hasHeader: false,
        path: './',
        files: [filePath],
        sheets: [2, 'sheet2', 0],
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toMatchSnapshot();
});