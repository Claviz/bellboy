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