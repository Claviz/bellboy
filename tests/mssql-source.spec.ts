import { Job, MssqlProcessor } from '../src';
import * as utils from '../src/utils';
import { CustomDestination } from './helpers';

let db: any = null;
const connection = {
    user: 'sa',
    password: 'Passw0rd*',
    server: 'mssql',
    database: 'tempdb',
};

beforeAll(async () => {
    db = await utils.getDb(connection, 'mssql');
});

beforeEach(async () => {
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

it('gets data from mssql', async () => {
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new MssqlProcessor({
        connection,
        query: `select id from test`,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        id: 123,
    }]);
});
