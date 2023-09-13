import { Job, DynamicProcessor, MssqlDestination } from '../src';
import { ITdsDriver, IMssqlDestinationConfig } from '../src/types';
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


describe.each(['tedious', 'msnodesqlv8'])('different drivers', (driverName) => {

    let nativeDriver: ITdsDriver | undefined;
    beforeAll(async () => {
        if (driverName === 'msnodesqlv8') {
            nativeDriver = await import('mssql/msnodesqlv8');
        }
    });

    beforeEach(async () => {
        db = await utils.getDb(connection, 'mssql', nativeDriver);
        await db.query(`DROP TABLE IF EXISTS test_sources`);
        await db.query(`CREATE TABLE test_sources
        (
            id integer
        )`);
    });

    afterEach(async () => {
        await utils.closeDbConnection(connection);
    })

    it(`inserts generated data to mssql using ${driverName} driver`, async () => {
        const processor = new DynamicProcessor({
            generator: async function* () {
                yield {
                    id: 1,
                }
            },
        });
        const destinationConfig: IMssqlDestinationConfig = {
            connection,
            table: 'test_sources',
            batchSize: 1,
        };
        if (nativeDriver) {
            destinationConfig.driver = nativeDriver;
        }
        const destination = new MssqlDestination(destinationConfig);
        const job = new Job(processor, [destination]);
        await job.run();
        const res = await db.query(`select * from test_sources`);
        expect(res.recordset).toEqual([{
            id: 1,
        }]);
    });
});
