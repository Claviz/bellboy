import { Job, DynamicProcessor, MySqlDestination } from '../src';
import * as utils from '../src/utils';
import mysql from 'mysql2-stream-fix/promise';

let db: mysql.Pool;
const connection = {
    user: 'root',
    host: 'mysql',
    database: 'test',
    password: 'password',
};

beforeEach(async () => {
    db = await utils.getDb(connection, 'mysql');
    await db.query(`DROP TABLE IF EXISTS test`);
});

afterEach(async () => {
    await utils.closeDbConnection(connection);
})

it('inserts generated data to mysql', async () => {
    await db.query(`CREATE TABLE test
    (
        id integer PRIMARY KEY,
        text text
    )`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
                text: 'something',
            }
        },
    });
    const destination = new MySqlDestination({
        connection,
        table: 'test',
        batchSize: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const [res] = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
        text: 'something',
    }]);

});

it('inserts generated data to mysql by batches', async () => {
    await db.query(`CREATE TABLE test
    (
        id integer PRIMARY KEY,
        text text
    )`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 3614; i++) {
                yield {
                    id: i,
                    text: 'something',
                }
            }
        },
    });
    const destination = new MySqlDestination({
        connection,
        table: 'test',
        batchSize: 100,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const [res] = await db.query(`select * from test`);
    expect((res as mysql.RowDataPacket[]).length).toEqual(3614);
});

it('inserts generated data to mysql table with column name that does not adhere to js syntax for variable names', async () => {
    await db.query(`CREATE TABLE test
    (
        id integer PRIMARY KEY,
        \`Rēķina datums\` text
    )`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
                'Rēķina datums': 'something',
            }
        },
    });
    const destination = new MySqlDestination({
        connection,
        table: 'test',
        batchSize: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const [res] = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
        'Rēķina datums': 'something',
    }]);

});

it('inserts data for columns avaiable in source data', async () => {
    await db.query(`CREATE TABLE test
    (
        id INTEGER PRIMARY KEY,
        text TEXT,
        lucky_number INTEGER NOT NULL DEFAULT 777
    )`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
                text: 'something',
            }
        },
    });
    const destination = new MySqlDestination({
        connection,
        table: 'test',
        batchSize: 1,
        useSourceColumns: true,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const [res] = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
        text: 'something',
        lucky_number: 777,
    }]);

});

it('loadedBatch event should include postLoadQuery result', async () => {
    await db.query(`CREATE TABLE test
    (
        id INT AUTO_INCREMENT PRIMARY KEY,
        text text
    )`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            for (let i = 0; i < 10; i++) {
                yield {
                    text: `something-${i}`,
                }
            }
        },
    });
    const destination = new MySqlDestination({
        connection,
        table: 'test',
        batchSize: 1,
        postLoadQuery: `SELECT LAST_INSERT_ID()`,
    });
    const job = new Job(processor, [destination]);
    let lastInsertId;
    job.on('loadedBatch', async (destinationIndex, data, result) => {
        lastInsertId = result[0][0]['LAST_INSERT_ID()'];
    });
    await job.run();
    expect(lastInsertId).toEqual(10);
});