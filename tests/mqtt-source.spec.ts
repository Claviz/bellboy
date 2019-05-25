import { Job, MqttProcessor } from '../src';
import { CustomDestination } from './helpers';

const mosca = require('mosca');

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
});

afterAll(async () => {
    clearInterval(interval);
    server.close();
})

it('gets messages from broker', async () => {
    const destination = new CustomDestination();
    const processor = new MqttProcessor({
        topics: ['presence'],
        url: 'mqtt://localhost',
        rowLimit: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        message: 'test',
        topic: 'presence',
    }]);
});

