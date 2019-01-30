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
    const processor = new bellboy.DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
                text: 'something',
            }
        },
        destinations: [
            {
                type: "postgres" as any,
                setup: {
                    connection,
                    table: 'test',
                }
            }
        ],

    });
    await processor.process();
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
    const processor = new bellboy.DynamicProcessor({
        generator: async function* () {
            yield {
                id: 1,
                id2: 1,
                text: 'something_updated',
            }
        },
        destinations: [
            {
                type: "postgres" as any,
                setup: {
                    connection,
                    table: 'test',
                    upsertConstraints: ['id', 'id2']
                }
            }
        ],

    });
    await processor.process();
    const res = await db.query(`select * from test`);
    expect(res).toEqual([{
        id: 1,
        id2: 1,
        text: 'something_updated',
    }]);

});
