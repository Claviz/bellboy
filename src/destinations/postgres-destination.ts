import { IPostgresDestinationConfig } from '../types';
import { getDb } from '../utils';
import { DatabaseDestination } from './base/database-destination';

const pgp = require('pg-promise')();

export class PostgresDestination extends DatabaseDestination {

    protected upsertConstraints: string[] | undefined;

    constructor(config: IPostgresDestinationConfig) {
        super(config);
        this.upsertConstraints = config.upsertConstraints;
    }

    async loadBatch(data: any[]) {
        const columns: string[] = [];
        const upsertConstraints = this.upsertConstraints;
        for (let i = 0; i < data.length; i++) {
            for (const key of Object.keys(data[i])) {
                if (!columns.includes(key)) {
                    columns.push(key);
                }
            }
        }
        const cs = new pgp.helpers.ColumnSet(columns, { table: this.table });
        const db = await getDb(this.connection, 'postgres');
        await db.tx(async (t: any) => {
            let query = pgp.helpers.insert(data, cs);
            if (upsertConstraints && upsertConstraints.length) {
                const columnsString = upsertConstraints.map(x => `"${x}"`).join(',');
                query += ` on conflict(${columnsString}) do update set ` +
                    cs.assignColumns({ from: 'EXCLUDED', skip: upsertConstraints });
            }
            return t.batch([
                t.none(query),
            ]);
        });
    }
}
