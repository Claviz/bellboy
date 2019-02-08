import * as bellboy from '../src';
import { Destination } from '../src/types';
const xlsx = require('node-xlsx');
import * as fs from 'fs';

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
    let data: any[] = [];
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['hello', 'world']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const processor = new bellboy.ExcelProcessor({
        hasHeader: false,
        path: './',
        files: [filePath],
        destinations: [
            {
                type: 'custom',
                batchSize: 1,
                load: async (rows) => {
                    data = [...data, ...rows];
                }
            } as Destination
        ],

    });
    await processor.process();
    expect(data).toEqual([{
        A: 'hello',
        B: 'world',
    }]);
});

it('parses xlsx with header', async () => {
    let data: any[] = [];
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['column1', 'column2'], ['hello', 'world']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const processor = new bellboy.ExcelProcessor({
        hasHeader: true,
        path: './',
        files: [filePath],
        destinations: [
            {
                type: 'custom',
                batchSize: 1,
                load: async (rows) => {
                    data = [...data, ...rows];
                }
            } as Destination
        ],

    });
    await processor.process();
    expect(data).toEqual([{
        column1: 'hello',
        column2: 'world',
    }]);
});

it('parses all xlsx files by pattern', async () => {
    let data: any[] = [];
    const buffer = xlsx.build([{
        name: 'sheet1',
        data: [['test']],
    }]);
    fs.writeFileSync(filePath, buffer);

    const processor = new bellboy.ExcelProcessor({
        hasHeader: false,
        path: './',
        filePattern: `.*\.(xlsx)`,
        destinations: [
            {
                type: 'custom',
                batchSize: 1,
                load: async (rows) => {
                    data = [...data, ...rows];
                }
            } as Destination
        ],

    });
    await processor.process();
    expect(data).toEqual([{
        A: 'test',
    }]);
});

it('parses specific sheet by name', async () => {
    let data: any[] = [];
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

    const processor = new bellboy.ExcelProcessor({
        hasHeader: false,
        path: './',
        files: [filePath],
        sheetName: 'sheet2',
        destinations: [
            {
                type: 'custom',
                batchSize: 1,
                load: async (rows) => {
                    data = [...data, ...rows];
                }
            } as Destination
        ],

    });
    await processor.process();
    expect(data).toEqual([{
        A: 'test2',
    }]);
});

it('parses specific sheet by index', async () => {
    let data: any[] = [];
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

    const processor = new bellboy.ExcelProcessor({
        hasHeader: false,
        path: './',
        files: [filePath],
        sheetIndex: 2,
        destinations: [
            {
                type: 'custom',
                batchSize: 1,
                load: async (rows) => {
                    data = [...data, ...rows];
                }
            } as Destination
        ],

    });
    await processor.process();
    expect(data).toEqual([{
        A: 'test3',
    }]);
});