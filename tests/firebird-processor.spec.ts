import { Job, FirebirdProcessor } from '../src';
import { IFirebirdDbConnection } from '../src/types';
import * as utils from '../src/utils';
import { CustomDestination } from './helpers';
import Firebird from 'node-firebird';

let db: Firebird.Database;
let query: any;
const connection: IFirebirdDbConnection = {
    user: 'firebird',
    password: 'password',
    host: 'firebird',
    database: 'db',
};

beforeEach(async () => {
    db = await utils.getDb(connection, 'firebird');
    query = async (query: any) => {
        return await new Promise((resolve, reject) => {
            db.query(query, [], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        })
    };
    await query(`
        EXECUTE BLOCK AS BEGIN
        IF (EXISTS(SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'TEST')) THEN
            EXECUTE STATEMENT 'DROP TABLE TEST';
        END
    `);
    await query(`
        CREATE TABLE test
        (
            ID INTEGER
        )
    `);
});

afterEach(async () => {
    await utils.closeDbConnection(connection);
})

it(`gets data from firebird db`, async () => {
    await query(`INSERT INTO TEST (ID) values (123)`);
    const destination = new CustomDestination({
        batchSize: 1,
    });
    const processor = new FirebirdProcessor({
        connection,
        query: `SELECT ID FROM TEST`,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([{
        ID: 123,
    }]);
});