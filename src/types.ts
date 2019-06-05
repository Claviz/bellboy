import { CoreOptions, UrlOptions, UriOptions } from 'request';
import { ReadStream } from 'fs';
import { Readable } from 'stream';
import { RequestPromiseOptions } from 'request-promise';

export interface IDbConnection {
    user?: string;
    password?: string;
    server?: string;
    host?: string;
    database?: string;
    schema?: string;
}

export interface IReporter {
    report(job: IJob): void;
}

export interface IJobConfig {
    reporters?: IReporter[];
}

export interface IJob {
    on(eventName: string, cb: event): void;
    run(): Promise<void>;
}

export interface IProcessorConfig {
    rowLimit?: number;
}

export interface IDynamicProcessorConfig extends IProcessorConfig {
    generator: () => AsyncIterableIterator<any>;
}

export interface IDirectoryProcessorConfig extends IProcessorConfig {
    path: string;
    filePattern?: string;
    files?: string[];
}

export interface IExcelProcessorConfig extends IDirectoryProcessorConfig {
    hasHeader?: boolean;
    ignoreEmpty?: boolean;
    sheets?: ((number | string)[] | sheetGetter);
}

export interface IProcessor {
    process(processStream: processStream, ...args: any): Promise<void>;
    rowLimit: number;
}

export interface IDestination {
    loadBatch: (data: any[]) => Promise<void>;
    batchSize: number;
    recordGenerator: ((row: any) => AsyncIterableIterator<{}>) | undefined;
    batchTransformer: ((rows: any[]) => Promise<any[]>) | undefined;
    // loadInMode: boolean;
    disableLoad: boolean;
}

export interface IDestinationConfig {
    disableLoad?: boolean;
    batchSize?: number;
    recordGenerator?: (row: any) => AsyncIterableIterator<{}>;
    batchTransformer?: (rows: any[]) => Promise<any[]>;
}

export interface IDatabaseDestinationConfig extends IDestinationConfig {
    table: string;
    connection: IDbConnection;
}

export interface IPostgresDestinationConfig extends IDatabaseDestinationConfig {
    upsertConstraints?: string[];
}

export interface IMssqlDestinationConfig extends IDatabaseDestinationConfig { }

export interface IHttpDestinationConfig extends IDestinationConfig {
    request: (UriOptions & RequestPromiseOptions) | (UrlOptions & RequestPromiseOptions);
}

export interface IStdoutDestinationConfig extends IDestinationConfig {
    asTable?: boolean;
}

export interface IHttpProcessorConfig extends IProcessorConfig {
    connection: CoreOptions & UrlOptions;
    nextRequest?: (header: any) => Promise<(CoreOptions & UrlOptions) | null | undefined>;
}

export interface IJsonHttpProcessorConfig extends IHttpProcessorConfig {
    dataFormat: 'json';
    jsonPath: string;
}

export interface IDelimitedHttpProcessorConfig extends IHttpProcessorConfig {
    dataFormat: 'delimited';
    delimiter: string;
}

export interface IDatabaseProcessorConfig extends IProcessorConfig {
    connection: any;
    query: string;
}

export interface IJsonProcessorConfig extends IDirectoryProcessorConfig {
    jsonPath: string;
}

export interface IDelimitedProcessorConfig extends IDirectoryProcessorConfig {
    delimiter: string;
}

export interface IMssqlProcessorConfig extends IDatabaseProcessorConfig {
}

export interface IPostgresProcessorConfig extends IDatabaseProcessorConfig {
}

export interface ITailProcessorConfig extends IDirectoryProcessorConfig {
    fromBeginning?: boolean;
}

export interface IMqttProcessorConfig extends IProcessorConfig {
    url: string;
    topics: string[];
}

export type DbTypes = 'postgres' | 'mssql';

export type event = (...args: any) => Promise<any>;

export type sheetGetter = (sheetNames: string[]) => Promise<string[]>;

export type emit = (event: string, ...args: any) => Promise<any>;

export type processStream = (readStream: ReadStream | Readable, ...args: any) => Promise<any>;
