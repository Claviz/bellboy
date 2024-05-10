import axios, { AxiosRequestConfig } from 'axios';
import mysql from 'mysql2-stream-fix/promise';
import Firebird from 'node-firebird';
import { Transform } from 'stream';

import {
    AuthorizationRequest,
    DbTypes,
    IDbConnection,
    IFirebirdDbConnection,
    IMssqlDbConnection,
    IMySqlDbConnection,
    IPostgresDbConnection,
    ITdsDriver,
} from './types';

const cachedDbConnections = new Map<string, { db: any, close: any }>();

function getCachedDbConnection(databaseConfig: IDbConnection) {
    const dbKey = getDbKey(databaseConfig);
    return cachedDbConnections.get(dbKey);
}

function getDbKey(databaseConfig: IPostgresDbConnection | IMssqlDbConnection) {
    if ('driver' in databaseConfig) {
        const configWithoutDriver = { ...databaseConfig };
        delete configWithoutDriver.driver;
        return JSON.stringify(configWithoutDriver);
    }
    return JSON.stringify(databaseConfig);
}

function setCachedDbConnection(databaseConfig: IDbConnection, db: any, close: any) {
    const dbKey = getDbKey(databaseConfig);
    cachedDbConnections.set(dbKey, { db, close });
}

function unsetCachedDbConnection(databaseConfig: IDbConnection) {
    const dbKey = getDbKey(databaseConfig);
    cachedDbConnections.delete(dbKey);
}

export async function getDb(databaseConfig: IDbConnection, dbType: DbTypes) {
    const dbConnection = getCachedDbConnection(databaseConfig);
    if (dbConnection) {
        return dbConnection.db;
    }

    switch (dbType) {
        case 'mssql':
            return await getMssqlDb(databaseConfig);
        case 'firebird':
            return await getFirebirdDb(databaseConfig);
        case 'mysql':
            return getMySqlDb(databaseConfig);
        case 'postgres':
        default:
            return getPostgresDb(databaseConfig);
    }
}

async function getMySqlDb(databaseConfig: IMySqlDbConnection) {
    const dbConnection = mysql.createPool(databaseConfig);
    setCachedDbConnection(databaseConfig, dbConnection, dbConnection.end.bind(dbConnection));
    return dbConnection;
}

async function getMssqlDb(databaseConfig: IMssqlDbConnection) {
    const driver = databaseConfig.driver ?? await import('mssql');
    const pool = getMssqlDbPool(driver, databaseConfig);
    const db = await pool.connect();
    setCachedDbConnection(databaseConfig, db, pool.close.bind(pool));
    return db;
}

function getMssqlDbPool(driver: ITdsDriver, databaseConfig: IMssqlDbConnection) {
    const poolConfig = { ...databaseConfig };
    delete poolConfig.driver;
    return new driver.ConnectionPool({ ...databaseConfig } as any);
}

function getPostgresDb(databaseConfig: IPostgresDbConnection) {
    const pgp = require('pg-promise')({ schema: databaseConfig.schema || 'public' });
    const db = pgp(databaseConfig);
    setCachedDbConnection(databaseConfig, db, pgp.end);
    return db;
}

async function getFirebirdDb(databaseConfig: IFirebirdDbConnection): Promise<Firebird.Database> {
    const Firebird = require('node-firebird');
    const db = await new Promise<Firebird.Database>((resolve, reject) => {
        Firebird.attach(databaseConfig, (err: any, db: Firebird.Database) => {
            if (err) reject(err);
            else resolve(db);
        });
    });
    setCachedDbConnection(databaseConfig, db, db.detach.bind(db));
    return db;
}

export async function closeDbConnection(databaseConfig: IDbConnection) {
    const dbConnection = getCachedDbConnection(databaseConfig);
    if (dbConnection) {
        await dbConnection.close();
        unsetCachedDbConnection(databaseConfig);
    }
}

export function getValueFromJSONChunk() {
    return new Transform({
        objectMode: true,
        transform(chunk: { index: any; value: any }, encoding, callback) {
            if (chunk.value) {
                this.push(chunk.value);
            }
            callback();
        }
    });
}

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
}

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
    };
    const generator = async function* () {
        for await (const row of readStream) {
            const result = processRow(row);
            if (result) {
                yield result;
            }
        }
    };

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
