import * as bellboy from '../src';
import * as utils from '../src/utils';
const mosca = require('mosca');

let interval: any;
let server: any;
let db: any = null;
const connection = {
    user: 'postgres',
    host: 'postgres',
    database: 'postgres',
    password: 'password',
};

beforeAll(async () => {
    db = await utils.getDb(connection, 'postgres');
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
    await db.query(`DROP TABLE IF EXISTS test`);
    await db.query(`CREATE TABLE test
    (
        message text,
        topic text
    )`);
});

afterAll(async () => {
    await utils.closeDbConnection(connection);
    clearInterval(interval);
    server.close();
})

it('inserts messages from broker to postgres', async () => {
    const processor = new bellboy.MqttProcessor({
        connection: {
            topics: ['presence'],
            url: 'mqtt://localhost',
        },
        destinations: [
            {
                type: "postgres" as any,
                setup: {
                    connection,
                    table: 'test',
                },
                batchSize: 1,
            }
        ],

    });
    processor.on('loadedData', async () => {
        return true;
    });
    await processor.process();
    const res = await db.query(`select * from test`);
    expect(res).toEqual([{
        message: 'test',
        topic: 'presence',
    }]);
});

