import * as bellboy from '../src';
import { Destination } from '../src/types';

const express = require('express');

let data: any[] = [];
const app = express();
app.get('/json', function (req: any, res: any) {
    res.send([{
        text: 'hello!',
    }]);
});
app.get('/delimited', function (req: any, res: any) {
    res.send('{"text": "hello"};{"text": "world"}');
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
        pagination: {
            nextUrl: 'http://localhost:3000/paginated-json-1',
        },
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
    data = [];
});

afterAll(async () => {
    server.close();
})

const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));

it('gets big JSON data from HTTP', async () => {
    const processor = new bellboy.HttpProcessor({
        dataFormat: 'json',
        jsonPath: 'arr.*',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/big-json`,
        },
        destinations: [
            {
                type: 'custom',
                batchSize: 100,
                load: async (rows) => {
                    await timeout(10);
                    data = [...data, ...rows];
                }
            } as Destination
        ],

    });
    await processor.process();
    expect(data.length).toEqual(13333);
});

it('gets JSON data from HTTP', async () => {
    const processor = new bellboy.HttpProcessor({
        dataFormat: 'json',
        jsonPath: '.',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/json`,
        },
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
        text: 'hello!',
    }]);
});

it('gets delimited data from HTTP', async () => {
    const processor = new bellboy.HttpProcessor({
        dataFormat: 'delimited',
        delimiter: ';',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/delimited`,
        },
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
    expect(data).toEqual(['{"text": "hello"}', '{"text": "world"}']);
});


it('gets paginated JSON data from HTTP', async () => {
    const connection = {
        method: `GET`,
        url: `http://localhost:3000/paginated-json`,
    };
    const processor = new bellboy.HttpProcessor({
        dataFormat: 'json',
        jsonPath: 'texts.*',
        connection,
        nextRequest: async function (header) {
            if (header && header.pagination) {
                return {
                    ...connection,
                    url: header.pagination.nextUrl,
                };
            }
            return null;
        },
        destinations: [
            {
                type: 'custom',
                batchSize: 1,
                load: async (rows) => {
                    data = [...data, ...rows];
                },
            } as Destination
        ],

    });
    await processor.process();
    expect(data).toEqual([{
        text: 'hello1',
    }, {
        text: 'hello2',
    }
    ]);
});