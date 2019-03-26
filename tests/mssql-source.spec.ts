import * as bellboy from '../src';
import * as utils from '../src/utils';
import { Destination } from '../src/types';

let data: any[] = [];
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
    const processor = new bellboy.MssqlProcessor({
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
