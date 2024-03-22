import { Job, DynamicProcessor, PostgresDestination } from '../src';
import * as utils from '../src/utils';

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
    await db.query(`DROP TABLE IF EXISTS test`);
    await db.query(`DROP SCHEMA IF EXISTS dbo CASCADE`);
});

afterAll(async () => {
    await utils.closeDbConnection(connection);
})

it('inserts generated data to postgres', async () => {
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
    const destination = new PostgresDestination({
        connection,
        table: 'test',
        batchSize: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const res = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
        text: 'something',
    }]);

});

it('upserts generated data in postgres with multiple constraints', async () => {
    await db.query(`CREATE TABLE test
    (
        id integer,
        id2 integer,
        text text,
        PRIMARY KEY (id, id2)
    )`);
    await db.query(`insert into test (id, id2, text) VALUES (1, 1, 'something')`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
                id2: 1,
                text: 'something_updated',
            }
        },
    });
    const destination = new PostgresDestination({
        connection,
        table: 'test',
        upsertConstraints: ['id', 'id2'],
        batchSize: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const res = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
        id2: 1,
        text: 'something_updated',
    }]);

});

it('inserts json data to postgres', async () => {
    await db.query(`CREATE TABLE test
    (
        data jsonb
    )`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            yield {
                data: {
                    text: 'something'
                }
            }
        },
    });
    const destination = new PostgresDestination({
        connection,
        table: 'test',
        batchSize: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const res = await db.query(`select * from test`);
    expect(res).toEqual([{
        data: {
            text: 'something',
        }
    }]);

});

it('inserts generated data to postgres with specific schema', async () => {
    await db.query(`CREATE SCHEMA dbo`);
    await db.query(`CREATE TABLE dbo.test
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
    const destination = new PostgresDestination({
        connection: {
            ...connection,
            schema: 'dbo',
        },
        table: 'test',
        batchSize: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const res = await db.query(`select * from dbo.test`);
    expect(res).toEqual([{
        id: 1,
        text: 'something',
    }]);

});

it('inserts generated data to postgres by batches', async () => {
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
    const destination = new PostgresDestination({
        connection,
        table: 'test',
        upsertConstraints: ['id'],
        batchSize: 100,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const res = await db.query(`select * from test`);
    expect(res.length).toEqual(3614);

});

it('inserts generated data to postgres table with column name that does not adhere to js syntax for variable names', async () => {
    await db.query(`CREATE TABLE test
    (
        id integer PRIMARY KEY,
        "Rēķina datums" text
    )`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
                'Rēķina datums': 'something',
            }
        },
    });
    const destination = new PostgresDestination({
        connection,
        table: 'test',
        batchSize: 1,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const res = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
        'Rēķina datums': 'something',
    }]);

});

it('inserts generated data to postgres even if some columns are missing', async () => {
    await db.query(`CREATE TABLE test
    (
        id integer PRIMARY KEY,
        text text,
        other_text text,
        another_text text
    )`);
    const processor = new DynamicProcessor({
        generator: async function* () {
            const data = [
                {
                    id: 1,
                    text: 'something',
                },
                {
                    id: 2,
                    other_text: 'other something',
                },
                {
                    id: 3,
                    another_text: 'another something',
                }
            ]
            for (const item of data) {
                yield item;
            }
        },
    });
    const destination = new PostgresDestination({
        connection,
        table: 'test',
        batchSize: 1000,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    const res = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
        text: 'something',
        other_text: null,
        another_text: null,
    }, {
        id: 2,
        text: null,
        other_text: 'other something',
        another_text: null,
    }, {
        id: 3,
        text: null,
        other_text: null,
        another_text: 'another something',
    }]);

});