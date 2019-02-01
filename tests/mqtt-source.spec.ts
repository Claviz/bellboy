import * as bellboy from '../src';
import { Destination } from '../src/types';
const mosca = require('mosca');

let data: any[] = [];
let interval: any;
let server: any;

beforeAll(async () => {
    server = new mosca.Server();
    server.on('ready', () => {
        interval = setInterval(function () {
            server.publish({
                topic: 'presence',
                payload: 'test',
                qos: 0,
                retain: false
            });
        }, 1000);
    });
});

beforeEach(async () => {
    data = [];
});

afterAll(async () => {
    clearInterval(interval);
    server.close();
})

it('gets messages from broker', async () => {
    const processor = new bellboy.MqttProcessor({
        connection: {
            topics: ['presence'],
            url: 'mqtt://localhost',
        },
        destinations: [
            {
                type: 'custom',
                batchSize: 1,
                load: async (rows) => {
                    data = rows;
                }
            } as Destination
        ],

    });
    processor.on('loadedData', async () => {
        return true;
    });
    await processor.process();
    expect(data).toEqual([{
        message: 'test',
        topic: 'presence',
    }]);
});

