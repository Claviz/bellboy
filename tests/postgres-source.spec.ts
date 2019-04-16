import * as bellboy from '../src';
import * as utils from '../src/utils';
import { Destination } from '../src/types';

let data: any[] = [];
let db: any = null;
const connection = {
    user: 'postgres',
    host: 'postgres',
    database: 'postgres',
    password: 'password',
};

beforeAll(async () => {
    db = await utils.getDb(connection, 'postgres');
});

beforeEach(async () => {
    data = [];
    await db.query(`DROP TABLE IF EXISTS test`);
    await db.query(`CREATE TABLE test
    (
        id integer
    )`);
    await db.query(`INSERT INTO test (id) values (123)`);
});

afterAll(async () => {
    await utils.closeDbConnection(connection);
})
const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));

it('gets data from postgres', async () => {
    const processor = new bellboy.PostgresProcessor({
        connection,
        query: `select id from test`,
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
    await processor.process();
    expect(data).toEqual([{
        id: 123,
    }]);
});

it('waits for data to be loaded before ending processing', async () => {
    const processor = new bellboy.PostgresProcessor({
        connection,
        query: `select id from test`,
        destinations: [
            {
                type: 'custom',
                batchSize: 100,
                load: async (rows) => {
                    await timeout(1000);
                    data = rows;
                }
            } as Destination
        ],

    });
    await processor.process();
    expect(data).toEqual([{
        id: 123,
    }]);
});
