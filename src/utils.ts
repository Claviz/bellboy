import sql from 'mssql';
import rp from 'request-promise';

import { DbTypes, IDbConnection, IHttpConnection } from './types';

const pgp = require('pg-promise')();

export async function sendRequest(data: any[], config: IHttpConnection) {
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

export async function insertToPostgres(data: any[], config: IDbConnection, tableName: string) {
    const columns: string[] = [];
    for (let i = 0; i < data.length; i++) {
        for (const key of Object.keys(data[i])) {
            if (!columns.includes(key)) {
                columns.push(key);
            }
        }
    }
    const db = await getDb(config, 'postgres');
    await db.tx(async (t: any) => {
        return t.batch([
            t.none(pgp.helpers.insert(data, new pgp.helpers.ColumnSet(columns, { table: tableName }))),
        ]);
    });
}

export async function insertToMsSql(data: any[], config: IDbConnection, tableName: string) {
    const db = await getDb(config, 'mssql') as sql.ConnectionPool;
    const query = await db.request().query(`SELECT TOP(0) * FROM ${tableName}`);
    let table = (query.recordset as any).toTable(tableName);
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