import { AxiosRequestConfig } from 'axios';
import { Job, HttpProcessor } from '../src';
import { CustomDestination, CustomTimeoutDestination } from './helpers';

const express = require('express');

const app = express();
app.get('/json', function (req: any, res: any) {
    res.send([{
        text: 'hello!',
    }]);
});
app.get('/delimited', function (req: any, res: any) {
    res.send('{"text": "hello"};{"text": "world"}');
});
app.get('/delimited-qualifier', function (req: any, res: any) {
    res.send('"Bob, the ""HaCk3r""",Riga\nAlice,"""Wonderland"", Apt. 22"\n');
});
app.get('/delimited-with-header-without-delimiter', function (req: any, res: any) {
    res.send('Name\nBob\nAlice');
});
app.get('/delimited-qualifier-delimiter-header', function (req: any, res: any) {
    res.send('Name;"Favourite color"\nBob;"Dark gray"\n"Elon Musk";orange');
});
app.get('/big-json', function (req: any, res: any) {
    let obj = {
        arr: [] as string[],
    };
    for (let i = 0; i < 13333; i++) {
        obj.arr.push('test');
    }
    res.send(obj);
});
app.get('/paginated-json', function (req: any, res: any) {
    res.send({
        texts: [{
            text: 'hello1',
        }]
    });
});
app.get('/paginated-json-1', function (req: any, res: any) {
    res.send({
        texts: [{
            text: 'hello2',
        }]
    });
});
const server = app.listen(3000);

beforeAll(async () => {
});

beforeEach(async () => {
});

afterAll(async () => {
    server.close();
})

it('gets big JSON data from HTTP', async () => {
    const destination = new CustomTimeoutDestination({
        batchSize: 100,
        timeout: 10,
    });
    const processor = new HttpProcessor({
        dataFormat: 'json',
        jsonPath: /arr.(\d+)/,
        connection: {
            method: `GET`,
            url: `http://localhost:3000/big-json`,
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData().length).toEqual(13333);
});

it('gets JSON data from HTTP', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'json',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/json`,
        },
        jsonPath: /(\d+)/,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        text: 'hello!',
    }]);
});

it('gets delimited data from HTTP', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'delimited',
        rowSeparator: ';',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/delimited`,
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: [], arr: ['{"text": "hello"}'], obj: undefined, row: '{"text": "hello"};' },
        { header: [], arr: ['{"text": "world"}'], obj: undefined, row: '{"text": "world"}' },
    ]);
});

it('gets delimited data with qualifier from HTTP', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'delimited',
        rowSeparator: '\n',
        delimiter: ',',
        qualifier: '"',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/delimited-qualifier`,
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: [], arr: ['Bob, the "HaCk3r"', 'Riga'], obj: undefined, row: '"Bob, the ""HaCk3r""",Riga\n' },
        { header: [], arr: ['Alice', '"Wonderland", Apt. 22'], obj: undefined, row: 'Alice,"""Wonderland"", Apt. 22"\n' },
    ]);
});

it('gets delimited data with qualifier, delimiter and header', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'delimited',
        rowSeparator: '\n',
        delimiter: ';',
        qualifier: '"',
        hasHeader: true,
        connection: {
            method: `GET`,
            url: `http://localhost:3000/delimited-qualifier-delimiter-header`,
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: ['Name', 'Favourite color'], arr: ['Bob', 'Dark gray'], obj: { Name: 'Bob', 'Favourite color': 'Dark gray' }, row: 'Bob;"Dark gray"\n' },
        { header: ['Name', 'Favourite color'], arr: ['Elon Musk', 'orange'], obj: { Name: 'Elon Musk', 'Favourite color': 'orange' }, row: '"Elon Musk";orange' },
    ]);
});

it('gets delimited data with header and without delimiter from HTTP', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'delimited',
        rowSeparator: '\n',
        hasHeader: true,
        connection: {
            method: `GET`,
            url: `http://localhost:3000/delimited-with-header-without-delimiter`,
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: ['Name'], arr: ['Bob'], obj: { Name: 'Bob' }, row: 'Bob\n' },
        { header: ['Name'], arr: ['Alice'], obj: { Name: 'Alice' }, row: 'Alice' },
    ]);
});

it('gets paginated JSON data from HTTP', async () => {
    const connection: AxiosRequestConfig = {
        method: `GET`,
        url: `http://localhost:3000/paginated-json`,
    };
    const destination = new CustomDestination({
        batchSize: 1,
    });
    let pageCount = 2;
    let currentPage = 0;
    const processor = new HttpProcessor({
        dataFormat: 'json',
        jsonPath: /texts.(\d+)/,
        connection,
        nextRequest: async function () {
            currentPage++;
            if (currentPage < pageCount) {
                return {
                    ...connection,
                    url: `http://localhost:3000/paginated-json-${currentPage}`,
                };
            }
            return null;
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        text: 'hello1',
    }, {
        text: 'hello2',
    }]);
});

it('respects rowLimit', async () => {
    const destination = new CustomDestination();
    const processor = new HttpProcessor({
        dataFormat: 'json',
        jsonPath: /arr.(\d+)/,
        connection: {
            method: `GET`,
            url: `http://localhost:3000/big-json`,
        },
        rowLimit: 3,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData().length).toEqual(3);
});

it('correctly handles HTTP error with incorrect connection config', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'json',
        connection: {
            method: `GET`,
            url: `http://error:3000/json`,
            proxy: {
                protocol: 'https',
                host: '127.0.0.1',
                port: 9000,
                auth: {
                    username: 'bellboy',
                    password: 'pass123'
                }
            }
        },
        jsonPath: /(\d+)/,
    });
    const job = new Job(processor, [destination]);
    const events: string[] = [];
    job.onAny(async (x, a) => events.push(x));
    await job.run();
    expect(events).toEqual([
        'startProcessing',
        'processingError',
        'endProcessing'
    ]);
});