import { AxiosRequestConfig } from 'axios';
import { Job, HttpProcessor } from '../src';
import { CustomDestination, CustomTimeoutDestination } from './helpers';
const iconv = require('iconv-lite');

const express = require('express');

const app = express();
app.post('/token-nested', function (req: any, res: any) {
    res.send({
        nested: {
            auth_token: 'secret',
        }
    });
});
app.post('/token', function (req: any, res: any) {
    res.send({
        auth_token: 'secret',
    });
});
app.get('/secured-by-param', function (req: any, res: any) {
    if (req.query.Authorization === 'Bearer secret') {
        res.send([{
            text: 'hello!',
        }]);
    } else {
        res.sendStatus(401);
    }
});
app.get('/secured-by-header', function (req: any, res: any) {
    if (req.header('Authorization') === 'Bearer secret') {
        res.send([{
            text: 'hello!',
        }]);
    } else {
        res.sendStatus(401);
    }
});
app.get('/json', function (req: any, res: any) {
    res.send([{
        text: 'hello!',
    }]);
});
app.get('/delimited', function (req: any, res: any) {
    res.send('{"text": "hello"};{"text": "world"}');
});
app.get('/error', function (req: any, res: any) {
    res.status(500).send({ success: false });
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
app.get('/xml', function (req: any, res: any) {
    res.send(`
        <?xml version="1.0" encoding="utf-8"?>
        <six>
            <item>
                <sample>
                    <c>0</c>
                </sample>
                <a>abc</a>
                <b>15</b>
            </item>
            <item>
                <sample>
                    <c>8</c>
                </sample>
                <a>def</a>
                <b>15</b>
            </item>
            <sample>
                <c>12</c>
            </sample>
        </six>
    `);
});
app.get('/windows-1257-encoded', function (req: any, res: any) {
    res.setHeader('Content-Type', 'text/plain; charset=windows-1257');
    const responseText = 'ĀāČč';
    const encodedBuffer = iconv.encode(responseText, 'windows-1257');
    res.send(encodedBuffer);
});

let server: any;;
let url: string;

beforeAll(async () => {
    server = app.listen(0);
    const address = server.address();
    const port = (typeof address === 'string') ? address : address?.port;
    url = `http://localhost:${port}`;
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
            url: `${url}/big-json`,
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
            url: `${url}/json`,
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
            url: `${url}/delimited`,
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
            url: `${url}/delimited-qualifier`,
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
            url: `${url}/delimited-qualifier-delimiter-header`,
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
            url: `${url}/delimited-with-header-without-delimiter`,
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
        url: `${url}/paginated-json`,
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
                    url: `${url}/paginated-json-${currentPage}`,
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
            url: `${url}/big-json`,
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

it('applies authorization to header', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'json',
        connection: {
            method: `GET`,
            url: `${url}/secured-by-header`,
        },
        jsonPath: /(\d+)/,
        authorizationRequest: {
            connection: {
                method: 'POST',
                url: `${url}/token`,
            },
            applyTo: 'header',
            destinationField: 'Authorization',
            sourceField: 'auth_token',
            prefix: 'Bearer ',
        }
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        text: 'hello!',
    }]);
});

it('applies authorization to header from nested sourceField', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'json',
        connection: {
            method: `GET`,
            url: `${url}/secured-by-header`,
        },
        jsonPath: /(\d+)/,
        authorizationRequest: {
            connection: {
                method: 'POST',
                url: `${url}/token-nested`,
            },
            applyTo: 'header',
            destinationField: 'Authorization',
            sourceField: 'nested.auth_token',
            prefix: 'Bearer ',
        }
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        text: 'hello!',
    }]);
});

it('applies authorization to query param', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'json',
        connection: {
            method: `GET`,
            url: `${url}/secured-by-param`,
        },
        jsonPath: /(\d+)/,
        authorizationRequest: {
            connection: {
                method: 'POST',
                url: `${url}/token`,
            },
            applyTo: 'query',
            destinationField: 'Authorization',
            sourceField: 'auth_token',
            prefix: 'Bearer ',
        }
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        text: 'hello!',
    }]);
});

it('gets JSON data from HTTP by using jsonPath as string', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'json',
        connection: {
            method: `GET`,
            url: `${url}/json`,
        },
        jsonPath: '(\\d+)',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        text: 'hello!',
    }]);
});

it('gets XML data from HTTP', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
        recordGenerator: async function* (row) {
            yield row.record.value;
        }
    });
    const processor = new HttpProcessor({
        dataFormat: 'xml',
        connection: {
            method: `GET`,
            url: `${url}/xml`,
        },
        saxOptions: {
            tag: ['A']
        }
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        'abc',
        'def',
    ]);
});

it('handles windows-1257 encoded data from HTTP', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'delimited',
        rowSeparator: '\n',
        connection: {
            method: 'GET',
            url: `${url}/windows-1257-encoded`,
        },
        encoding: 'windows-1257',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: [], arr: ['ĀāČč'], obj: undefined, row: 'ĀāČč' },
    ]);
});

it.only('HTTP error response should be present in error message', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new HttpProcessor({
        dataFormat: 'json',
        connection: {
            method: `GET`,
            url: `${url}/error`,
        },
        jsonPath: /(\d+)/,
    });
    const job = new Job(processor, [destination]);
    let error;
    job.onAny(async (x, a) => {
        if (x === 'processingError') {
            error = a.message;
        }
    });
    await job.run();
    expect(error).toEqual('Request failed with status code 500. Response: {"success":false}');
});
