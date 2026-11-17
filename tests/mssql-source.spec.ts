import { Job, MssqlProcessor } from '../src';
import { IMssqlDbConnection } from '../src/types';
import * as utils from '../src/utils';
import { CustomDestination } from './helpers';

let db: any = null;
const connection: IMssqlDbConnection = {
    user: 'sa',
    password: 'Passw0rd*',
    server: 'mssql',
    database: 'tempdb',
    options: {
        trustServerCertificate: true,
    }
};

describe.each(['tedious', 'msnodesqlv8'])('different drivers', (driverName) => {

    beforeEach(async () => {
        if (driverName === 'msnodesqlv8') {
            connection.driver = await import('mssql/msnodesqlv8');
        }

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

    it(`gets data from mssql using ${driverName} driver`, async () => {
        await db.query(`INSERT INTO test (id) values (123)`);
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

    it(`respects rowLimit using ${driverName} driver`, async () => {
        await db.query(`INSERT INTO test (id) values (1), (2), (3), (4)`);
        const destination = new CustomDestination();
        const processor = new MssqlProcessor({
            connection,
            query: `select id from test`,
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

    it(`lets jobs that share a connection run at the same time using ${driverName} driver`, async () => {
        const start = (query: string) => {
            const destination = new CustomDestination();
            const job = new Job(new MssqlProcessor({ connection, query }), [destination]);
            const event = (eventName: string) => new Promise<void>(resolve => job.on(eventName as any, async () => resolve()));
            const queryStarted = event('startProcessingStream');
            const rowsRead = event('endProcessingStream');
            const data = job.run().then(() => destination.getData());
            return { queryStarted, rowsRead, data };
        };
        // A slow job is still running when a fast one finishes; a third job starts right after that.
        const slow = start(`WAITFOR DELAY '00:00:02'; select 1 id`);
        await slow.queryStarted;
        const fast = start(`select 2 id`);
        await fast.rowsRead;
        await new Promise(resolve => setImmediate(resolve));
        const late = start(`select 3 id`);
        expect(await Promise.all([slow.data, fast.data, late.data])).toEqual([[{ id: 1 }], [{ id: 2 }], [{ id: 3 }]]);
    });
});
