import { Readable } from 'stream';

import { Job, PostgresProcessor } from '../src';
import * as utils from '../src/utils';
import { CustomDestination, CustomTimeoutDestination } from './helpers';

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
    await db.query(`DROP TABLE IF EXISTS test_sources`);
    await db.query(`CREATE TABLE test_sources
    (
        id integer
    )`);
});

afterAll(async () => {
    await utils.closeDbConnection(connection);
})

afterEach(() => {
    jest.restoreAllMocks();
});

const mockPostgresConnection = (stream: Readable) => {
    const done = jest.fn();
    const query = jest.fn().mockReturnValue(stream);
    const connect = jest.fn().mockResolvedValue({
        client: { query },
        done,
    });

    jest.spyOn(utils, 'getDb').mockResolvedValue({ connect } as any);

    return { done };
};

it('gets data from postgres', async () => {
    await db.query(`INSERT INTO test_sources (id) values (123)`);
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new PostgresProcessor({
        connection,
        query: `select id from test_sources`,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        id: 123,
    }]);
});

it('waits for data to be loaded before ending processing', async () => {
    await db.query(`INSERT INTO test_sources (id) values (123)`);
    const destination = new CustomTimeoutDestination({
        batchSize: 100,
        timeout: 1000,
    });
    const processor = new PostgresProcessor({
        connection,
        query: `select id from test_sources`,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        id: 123,
    }]);
});

it('respects rowLimit', async () => {
    await db.query(`INSERT INTO test_sources (id) values (1), (2), (3), (4)`);
    const destination = new CustomDestination();
    const processor = new PostgresProcessor({
        connection,
        query: `select id from test_sources`,
        rowLimit: 3,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        id: 1,
    }, {
        id: 2,
    }, {
        id: 3,
    }]);
});

it('releases the postgres connection after successful processing', async () => {
    const stream = Readable.from([{ id: 123 }]);
    const { done } = mockPostgresConnection(stream);
    const processor = new PostgresProcessor({
        connection,
        query: 'select id from test_sources',
    });

    await processor.process(async (input) => {
        for await (const row of input) {
            expect(row).toEqual({ id: 123 });
        }
    });

    expect(done).toHaveBeenCalledTimes(1);
});

it('destroys the query stream and releases the postgres connection after processing fails', async () => {
    const stream = Readable.from([{ id: 123 }]);
    const { done } = mockPostgresConnection(stream);
    const processor = new PostgresProcessor({
        connection,
        query: 'select id from test_sources',
    });
    const processingError = new Error('Processing failed');

    await expect(processor.process(async () => {
        throw processingError;
    })).rejects.toBe(processingError);

    expect(stream.destroyed).toBe(true);
    expect(done).toHaveBeenCalledTimes(1);
});
