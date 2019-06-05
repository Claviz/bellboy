import { Job, DynamicProcessor, HttpDestination } from '../src';

const express = require('express');
const bodyParser = require('body-parser');

let data: any[] = [];
const app = express();
app.use(bodyParser.json());
app.post('/', function (req: any, res: any) {
    data.push(req.body);
    res.send();
});
const server = app.listen(3000);

beforeAll(async () => {
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
            uri: 'http://localhost:3000',
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
            uri: 'http://localhost:3000',
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
