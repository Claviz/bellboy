import { Job, MqttProcessor } from '../src';
import { CustomDestination } from './helpers';

let interval: any;
let server: any;
let aedesInstance: any;

beforeAll(async () => {
    await startServer();
    interval = setInterval(function () {
        aedesInstance.publish({
            topic: 'presence',
            payload: 'test',
            qos: 0,
            retain: false,
        }, () => { });
    }, 1000);
});

beforeEach(async () => {
});

afterAll(async () => {
    clearInterval(interval);
    await closeServer();
})

async function closeServer() {
    return new Promise<any>(async (resolve, reject) => {
        server.close(() => { aedesInstance.close(resolve) });
    });
}

async function startServer() {
    return new Promise<any>(async (resolve, reject) => {
        aedesInstance = require('aedes')();
        server = require('net').createServer(aedesInstance.handle);
        server.listen(1883, resolve);
    });
}

it('gets messages from broker', async () => {
    const destination = new CustomDestination();
    const processor = new MqttProcessor({
        topics: ['presence'],
        url: 'mqtt://localhost:1883',
        rowLimit: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        message: 'test',
        topic: 'presence',
    }]);
});

