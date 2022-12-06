import axios, { AxiosRequestConfig } from 'axios';
import { Transform } from 'stream';

import { AuthorizationRequest, DbTypes, IDbConnection } from './types';

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

export function removeCircularReferencesFromChunk() {
    return new Transform({
        objectMode: true,
        transform(chunk: any, encoding, callback) {
            function getCircularReplacer() {
                const seen = new WeakSet();
                return (key: any, value: any) => {
                    if (typeof value === "object" && value !== null) {
                        if (seen.has(value)) {
                            return;
                        }
                        seen.add(value);
                    }
                    return value;
                };
            }
            this.push(JSON.parse(JSON.stringify(chunk, getCircularReplacer())));

            callback();
        }
    });
};

export function getDelimitedGenerator({
    readStream,
    hasHeader,
}: { readStream: any; hasHeader: boolean; }) {
    let header: string[] = [];
    const processRow = ({ raw, record }: { raw: string; record: string[] }) => {
        if (hasHeader && !header.length) {
            header = record.map((x: string) => x.trim());
        } else {
            let obj;
            if (header.length) {
                obj = Object.fromEntries(header.map((x: any, i: any) => [x, record[i]]));
            }
            return { header, arr: record, obj, row: raw };
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

export async function applyHttpAuthorization(connection: AxiosRequestConfig, authorizationRequest?: AuthorizationRequest) {
    if (authorizationRequest) {
        const authorizationResponse = await axios(authorizationRequest.connection);
        const authorizationToken = authorizationResponse.data[authorizationRequest.sourceField];

        const applyTo = authorizationRequest.applyTo === 'header' ? 'headers' : 'params';
        connection[applyTo] = {
            ...connection[applyTo],
            [authorizationRequest.destinationField]: authorizationRequest.prefix ? `${authorizationRequest.prefix}${authorizationToken}` : authorizationToken,
        };
    }
}