import sql from 'mssql';

import { IMssqlDestinationConfig } from '../types';
import { getDb } from '../utils';
import { DatabaseDestination } from './base/database-destination';

export class MssqlDestination extends DatabaseDestination {

    constructor(config: IMssqlDestinationConfig) {
        super(config);
    }

    async loadBatch(data: any[]) {
        const db = await getDb(this.connection, 'mssql') as sql.ConnectionPool;
        const query = await db.request().query(`SELECT TOP(0) * FROM ${this.table}`);
        let table = (query.recordset as any).toTable(this.table);
        const columns = table.columns.map((x: any) => x.name);
        const transaction = new sql.Transaction(db);
        await transaction.begin();
        for (let x of data) {
            let args = [];
            for (let ii = 0; ii < columns.length; ii++) {
                args.push(x[columns[ii]]);
            }
            table.rows.add(...args);
        }
        await transaction.request().bulk(table);
        await transaction.commit();
    }
}
