import { CoreOptions, UrlOptions } from 'request';

export interface IDbConnection {
    user?: string;
    password?: string;
    server?: string;
    host?: string;
    database?: string;
    schema?: string;
}

interface IDestination {
    batchSize: number;
    recordGenerator?: (row: any) => AsyncIterableIterator<{}>;
    batchTransformer?: (rows: any[]) => Promise<any[]>;
}

export interface IHttpConnection {
    method: 'GET' | 'POST' | 'DELETE' | 'PUT';
    uri: string;
}

export interface ICustomDestination extends IDestination {
    type: 'custom',
    load: (rows: any[]) => Promise<void>;
}

export interface IPostgresDestination extends IDestination {
    type: 'postgres';
    setup: {
        table: string;
        connection: IDbConnection;
        upsertConstraints?: string[];
    }
}

interface IStdoutDestination extends IDestination {
    type: 'stdout';
    asTable?: boolean;
}

export interface IMssqlDestination extends IDestination {
    type: 'mssql';
    setup: {
        table: string;
        connection: IDbConnection;
    }
}

export interface IHttpDestination extends IDestination {
    type: 'http';
    setup: IHttpConnection;
}

export interface IConfig {
    destinations?: Destination[];
    verbose?: boolean;
}

export interface IFileConfig extends IConfig {
    path: string;
    filePattern?: string;
    files?: string[];
}

export interface IHttpConfig extends IConfig {
    connection: CoreOptions & UrlOptions;
    nextRequest?: (header: any) => Promise<any>;
}

export interface IJsonHttpConfig extends IHttpConfig {
    dataFormat: 'json';
    jsonPath: string;
}

export interface IDelimitedHttpConfig extends IHttpConfig {
    dataFormat: 'delimited';
    delimiter: string;
}

export interface IDatabaseConfig extends IConfig {
    connection: any;
    query: string;
}

export interface IExcelConfig extends IFileConfig {
    hasHeader?: boolean;
    skipRows?: number;
    sheetName?: string;
    sheetIndex?: number;
    sheetGetter?(sheets: string[]): Promise<string>;
}

export interface IJsonConfig extends IFileConfig {
    jsonPath: string;
}

export interface ITailConfig extends IFileConfig {
    fromBeginning?: boolean;
}

export interface IDynamicConfig extends IConfig {
    generator: () => AsyncIterableIterator<any>;
}

export interface IMqttConfig extends IConfig {
    connection: {
        url: string;
        topics: string[];
    }
}

export interface IProcessor {
    on(eventName: string, cb: event): void;
    process(): Promise<void>;
    addDestination(destination: Destination): void;
}



export type DbTypes = 'postgres' | 'mssql';

export type event = (...args: any) => Promise<void | any>;

export type emit = (event: string, ...args: any) => Promise<void | any>;

export type Destination =
    IPostgresDestination |
    IStdoutDestination |
    IMssqlDestination |
    IHttpDestination |
    ICustomDestination;
