import sql from 'mssql';
import { Readable } from 'stream';

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
        const pool = new sql.ConnectionPool({ ...databaseConfig } as sql.config);
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

export function getReadableJsonStream(jsonStream: Readable): Readable {
    const readableJsonStream = new Readable({
        objectMode: true,
        async read() {
            const data = await magic();
            if (!data) {
                return this.push(null);
            }
            this.push(data);
        },
    });
    const magic = async () => {
        return new Promise<any>(async (resolve, reject) => {
            function removeListeners() {
                jsonStream.removeListener('data', onRow);
                jsonStream.removeListener('done', onDone);
                jsonStream.removeListener('close', onDone);
                jsonStream.removeListener('error', onError);
            };
            async function onRow(row: any) {
                jsonStream.pause();
                removeListeners();
                resolve(row);
            };
            async function onDone() {
                removeListeners();
                resolve();
            };
            async function onError(err: any) {
                removeListeners();
                reject(err);
            };
            jsonStream.on('data', onRow);
            jsonStream.on('done', onDone);
            jsonStream.on('close', onDone);
            jsonStream.on('error', onError);
            jsonStream.resume();
        });
    }
    return readableJsonStream;
}