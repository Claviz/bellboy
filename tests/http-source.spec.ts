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
const server = app.listen(3000);

beforeAll(async () => {

});

beforeEach(async () => {
    data = [];
});

afterAll(async () => {
    server.close();
})

it('gets JSON data from HTTP', async () => {
    const processor = new bellboy.HttpProcessor({
        dataFormat: 'json',
        jsonPath: '.',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/json`,
        },
        verbose: true,
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
        verbose: true,
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
