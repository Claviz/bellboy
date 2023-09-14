import { IPostgresDestinationConfig, IPostgresDbConnection } from '../types';
import { getDb } from '../utils';
import { DatabaseDestination } from './base/database-destination';

const pgp = require('pg-promise')();

export class PostgresDestination extends DatabaseDestination {

    protected connection: IPostgresDbConnection;
    protected upsertConstraints: string[] | undefined;

    constructor(config: IPostgresDestinationConfig) {
        super(config);
        this.connection = config.connection;
        this.upsertConstraints = config.upsertConstraints;
    }

    async loadBatch(data: any[]) {
        const dataToUpload: any[] = [];
        const columnDict: { [key: string]: string } = {};
        const upsertConstraints = this.upsertConstraints;
        let columnIndex = 0;
        for (let i = 0; i < data.length; i++) {
            const transformed: { [key: string]: any } = {};
            for (const key of Object.keys(data[i])) {
                if (!columnDict[key]) {
                    columnDict[key] = `column_${columnIndex}`;
                    columnIndex += 1;
                }
                transformed[columnDict[key]] = data[i][key];
            }
            dataToUpload.push(transformed);
        }
        const columns = Object.keys(columnDict).map(x => ({ name: x, prop: columnDict[x] }));
        const cs = new pgp.helpers.ColumnSet(columns, { table: this.table });
        const db = await getDb(this.connection, 'postgres');
        await db.tx(async (t: any) => {
            let query = pgp.helpers.insert(dataToUpload, cs);
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
