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
    expect(destination.getData()).toEqual([{
        formatted: {
            arr: ['hello', 'world'],
            obj: { A: 'hello', B: 'world' }
        },
        raw: {
            arr: ['hello', 'world'],
            obj: { A: 'hello', B: 'world' }
        },
        header: [],
    }]);
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
    expect(destination.getData()).toEqual([{
        formatted: {
            arr: ['hello', 'world'],
            obj: { column1: 'hello', column2: 'world' }
        },
        raw: {
            arr: ['hello', 'world'],
            obj: { column1: 'hello', column2: 'world' }
        },
        header: [
            'column1',
            'column2'
        ]
    }]);
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
    expect(destination.getData()).toEqual([{
        formatted: {
            arr: ['test'],
            obj: { A: 'test' }
        },
        raw: {
            arr: ['test'],
            obj: { A: 'test' }
        },
        header: [],
    }]);
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
        sheetName: 'sheet2',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        formatted: {
            arr: ['test2'],
            obj: { A: 'test2' }
        },
        raw: {
            arr: ['test2'],
            obj: { A: 'test2' }
        },
        header: [],
    }]);
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
        sheetIndex: 2,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        formatted: {
            arr: ['test3'],
            obj: { A: 'test3' }
        },
        raw: {
            arr: ['test3'],
            obj: { A: 'test3' }
        },
        header: [],
    }]);
});

it('parses specific sheet by function (function gets last sheet)', async () => {
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
        sheetGetter: async (sheets) => {
            return sheets[sheets.length - 1];
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        formatted: {
            arr: ['test3'],
            obj: { A: 'test3' }
        },
        raw: {
            arr: ['test3'],
            obj: { A: 'test3' }
        },
        header: [],
    }]);
});