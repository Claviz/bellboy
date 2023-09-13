import { IMssqlDestinationConfig, ITdsDriver } from '../types';
import { DatabaseDestination } from './base/database-destination';

export class MssqlDestination extends DatabaseDestination {

    driver?: ITdsDriver;

    constructor(config: IMssqlDestinationConfig) {
        super(config);
        if (config.driver) {
            this.driver = config.driver;
        } else if (config.connection.driver === 'msnodesqlv8') {
            console.warn('Falling back to Tedious driver. Add mssql/msnodesqlv8 driver to MssqlDestination config.');
        }
    }

    async loadBatch(data: any[]) {
        const sql = this.driver ?? await import('mssql');
        const pool = new sql.ConnectionPool({ ...this.connection } as any);
        const db = await pool.connect();
        const query = await db.request().query(`SELECT TOP(0) * FROM ${this.table}`);
        let table = (query.recordset as any).toTable(this.table);
        const columns = table.columns.map((x: any) => x.name);
        for (let x of data) {
            let args = [];
            for (let ii = 0; ii < columns.length; ii++) {
                args.push(x[columns[ii]]);
            }
            table.rows.add(...args);
        }
        const transaction = new sql.Transaction(db);
        try {
            await transaction.begin();
            await transaction.request().bulk(table);
            await transaction.commit();
        } catch (err) {
            if (!(transaction as any)._aborted) {
                await transaction.rollback();
            }
            await pool.close();
            throw err;
        }
        await pool.close();
    }
}
