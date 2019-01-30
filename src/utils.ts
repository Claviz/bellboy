import sql from 'mssql';
import rp from 'request-promise';

import { DbTypes, IDbConnection, IPostgresDestination, IMssqlDestination, IHttpDestination } from './types';

const pgp = require('pg-promise')();

export async function sendRequest(data: any[], destination: IHttpDestination) {
    const config = destination.setup;
    const request = {
        method: config.method,
        uri: config.uri,
        json: true,
    };
    if (config.oneRequestPerBatch) {
        const body = await config.transformBody(data);
        await rp({
            ...request,
            body,
        });
    } else {
        for (let i = 0; i < data.length; i++) {
            const body = await config.transformBody(data[i]);
            await rp({
                ...request,
                body,
            });
        }
    }
}

export async function insertToPostgres(data: any[], destination: IPostgresDestination) {
    const columns: string[] = [];
    const upsertConstraints = destination.setup.upsertConstraints;
    for (let i = 0; i < data.length; i++) {
        for (const key of Object.keys(data[i])) {
            if (!columns.includes(key)) {
                columns.push(key);
            }
        }
    }
    const cs = new pgp.helpers.ColumnSet(columns, { table: destination.setup.table });
    const db = await getDb(destination.setup.connection, 'postgres');
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

export async function insertToMsSql(data: any[], destination: IMssqlDestination) {
    const db = await getDb(destination.setup.connection, 'mssql') as sql.ConnectionPool;
    const query = await db.request().query(`SELECT TOP(0) * FROM ${destination.setup.table}`);
    let table = (query.recordset as any).toTable(destination.setup.table);
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

const cachedDbConnections = new Map<string, { db: any, close: any }>();
export async function getDb(databaseConfig: IDbConnection, dbType: DbTypes) {
    const dbKey = JSON.stringify(databaseConfig);
    if (cachedDbConnections.has(dbKey)) {
        const dbConnection = cachedDbConnections.get(dbKey);
        if (dbConnection) {
            return dbConnection.db;
        }
    }
    if (dbType === 'mssql') {
        const pool = new sql.ConnectionPool({ ...databaseConfig } as sql.config);
        const db = await pool.connect();
        cachedDbConnections.set(dbKey, {
            db,
            close: pool.close.bind(pool),
        });
        return db;
    } else {
        const db = pgp(databaseConfig);
        cachedDbConnections.set(dbKey, {
            db,
            close: pgp.end,
        });
        return db;
    }
};

export async function closeDbConnection(databaseConfig: IDbConnection) {
    const dbKey = JSON.stringify(databaseConfig);
    if (cachedDbConnections.has(dbKey)) {
        const dbConnection = cachedDbConnections.get(dbKey);
        if (dbConnection) {
            await dbConnection.close();
        }
    }
}