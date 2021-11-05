import { Transform } from 'stream';

import { DbTypes, IDbConnection } from './types';

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
        const sql = databaseConfig.driver === 'msnodesqlv8' ? await import('mssql/msnodesqlv8') : await import('mssql');
        const pool = new sql.ConnectionPool({ ...databaseConfig } as any);
        const db = await pool.connect();
        cachedDbConnections.set(dbKey, {
            db,
            close: pool.close.bind(pool),
        });
        return db;
    } else {
        const pgp = require('pg-promise')({ schema: databaseConfig.schema || 'public', });
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
            cachedDbConnections.delete(dbKey);
        }
    }
}

export function getValueFromJSONChunk() {
    return new Transform({
        objectMode: true,
        transform(chunk: { index: any; value: any }, encoding, callback) {
            this.push(chunk.value);
            callback();
        }
    });
};

export function getDelimitedGenerator({ readStream, delimiter, qualifier, hasHeader }: { readStream: any; delimiter?: string; qualifier?: string; hasHeader: boolean; }) {
    let header: string[] = [];
    const splitRegExp = new RegExp(`${delimiter}(?=(?:(?:[^${qualifier}]*${qualifier}){2})*[^${qualifier}]*$)`);
    const processRow = (row: any) => {
        let arr: string[] = [];
        if (qualifier) {
            arr = row.split(splitRegExp);
        } else {
            arr = row.split(delimiter);
        }
        if (hasHeader && !header.length) {
            header = arr.map((x: string) => x.trim());
        } else {
            let obj;
            if (header.length) {
                obj = Object.fromEntries(header.map((x: any, i: any) => [x, arr[i]]));
            }
            return { header, arr, obj, row };
        }
    }
    const generator = async function* () {
        for await (const row of readStream) {
            const result = processRow(row);
            if (result) {
                yield result;
            }
        }
    }

    return generator;
}