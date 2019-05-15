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
        jsonPath: 'arr.*',
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
        jsonPath: '.',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/json`,
        },
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
        delimiter: ';',
        connection: {
            method: `GET`,
            url: `http://localhost:3000/delimited`,
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual(['{"text": "hello"}', '{"text": "world"}']);
});


it('gets paginated JSON data from HTTP', async () => {
    const connection = {
        method: `GET`,
        url: `http://localhost:3000/paginated-json`,
    };
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
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
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        text: 'hello1',
    }, {
        text: 'hello2',
    }]);
});