import * as bellboy from '../src';
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
    await db.query(`CREATE TABLE test
    (
        id integer
    )`);
});

afterAll(async () => {
    await utils.closeDbConnection(connection);
})

it('inserts generated data to postgres', async () => {
    const processor = new bellboy.DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
            }
        },
        destinations: [
            {
                type: "postgres" as any,
                setup: {
                    connection,
                    table: 'test'
                }
            }
        ],

    });
    await processor.process();
    const res = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
    }]);

});
