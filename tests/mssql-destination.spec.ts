import * as bellboy from '../src';
import * as utils from '../src/utils';
import { Destination } from '../src/types';

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
});

afterAll(async () => {
    await utils.closeDbConnection(connection);
})

it('inserts generated data to mssql', async () => {
    const processor = new bellboy.DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
            }
        },
        destinations: [
            {
                type: 'mssql',
                setup: {
                    connection,
                    table: 'test'
                },
                batchSize: 1,
            } as Destination
        ],

    });
    await processor.process();
    const res = await db.query(`select * from test`);
    expect(res.recordset).toEqual([{
        id: 1,
    }]);
});
