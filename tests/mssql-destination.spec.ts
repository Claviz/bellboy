import { Job, DynamicProcessor, MssqlDestination } from '../src';
import * as utils from '../src/utils';

let db: any = null;
const connection: any = {
    user: 'sa',
    password: 'Passw0rd*',
    server: 'mssql',
    database: 'tempdb',
    driver: null,
    options: {
        trustServerCertificate: true,
    }
};
describe.each(['tedious', 'msnodesqlv8'])('different drivers', (driver) => {

    beforeEach(async () => {
        connection.driver = driver;
        db = await utils.getDb(connection, 'mssql');
        await db.query(`DROP TABLE IF EXISTS test`);
        await db.query(`CREATE TABLE test
        (
            id integer
        )`);
    });

    afterEach(async () => {
        await utils.closeDbConnection(connection);
    })

    it(`inserts generated data to mssql using ${driver} driver`, async () => {
        const processor = new DynamicProcessor({
            generator: async function* () {
                yield {
                    id: 1,
                }
            },
        });
        const destination = new MssqlDestination({
            connection,
            table: 'test',
            batchSize: 1,
        });
        const job = new Job(processor, [destination]);
        await job.run();
        const res = await db.query(`select * from test`);
        expect(res.recordset).toEqual([{
            id: 1,
        }]);
    });
});
