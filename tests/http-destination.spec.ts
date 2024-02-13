import { Job, DynamicProcessor, HttpDestination } from '../src';

const express = require('express');
const bodyParser = require('body-parser');

let data: any[] = [];
const app = express();

app.post('/token', function (req: any, res: any) {
    res.send({
        auth_token: 'secret',
    });
});

app.post('/secured-by-param', bodyParser.json(), function (req: any, res: any) {
    if (req.query.Authorization === 'Bearer secret') {
        data.push(req.body);
        res.send();
    } else {
        res.sendStatus(401);
    }
});

app.post('/secured-by-header', bodyParser.json(), function (req: any, res: any) {
    if (req.header('Authorization') === 'Bearer secret') {
        data.push(req.body);
        res.send();
    } else {
        res.sendStatus(401);
    }
});

app.post('/', bodyParser.json(), function (req: any, res: any) {
    data.push(req.body);
    res.send();
});

app.post('/text', bodyParser.text(), function (req: any, res: any) {
    data.push(req.body);
    res.send();
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
    data = [];
});

afterAll(async () => {
    server.close();
});

it('posts generated objects to http destination', async () => {
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield {
                    text: 'something'
                }
            }
        },
    });
    const destination = new HttpDestination({
        request: {
            method: 'POST',
            url,
        },
        batchSize: 2,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(data).toEqual([{
        text: 'something'
    }, {
        text: 'something'
    }, {
        text: 'something'
    }]);
});

it('posts transformed generated objects to http destination', async () => {
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield {
                    text: 'something'
                }
            }
        },
    });
    const destination = new HttpDestination({
        request: {
            method: 'POST',
            url,
        },
        batchSize: 2,
        batchTransformer: async (rows) => {
            return [{
                objects: rows,
            }];
        }
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(data).toEqual([{
        objects: [{
            text: 'something'
        }, {
            text: 'something'
        }],
    }, {
        objects: [{
            text: 'something'
        }],
    }]);
});

it('posts text data to http destination', async () => {
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield `<h3>Hello, world ${i}!</h3>`;
            }
        },
    });
    const destination = new HttpDestination({
        request: {
            method: 'POST',
            url: `${url}/text`,
            headers: {
                'Content-Type': 'text/plain',
            },
        },
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(data).toEqual([
        '<h3>Hello, world 0!</h3>',
        '<h3>Hello, world 1!</h3>',
        '<h3>Hello, world 2!</h3>',
    ]);
});

it('posts generated objects to secured by header http destination', async () => {
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield {
                    text: 'something'
                }
            }
        },
    });
    const destination = new HttpDestination({
        request: {
            method: 'POST',
            url: `${url}/secured-by-header`,
        },
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
    expect(data).toEqual([{
        text: 'something'
    }, {
        text: 'something'
    }, {
        text: 'something'
    }]);
});

it('posts generated objects to secured by query param http destination', async () => {
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3; i++) {
                yield {
                    text: 'something'
                }
            }
        },
    });
    const destination = new HttpDestination({
        request: {
            method: 'POST',
            url: `${url}/secured-by-param`,
        },
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
    expect(data).toEqual([{
        text: 'something'
    }, {
        text: 'something'
    }, {
        text: 'something'
    }]);
});