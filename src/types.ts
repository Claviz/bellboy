import { CoreOptions, UrlOptions } from 'request';
import { ReadStream } from 'fs';
import { Readable } from 'stream';

export interface IDbConnection {
    user?: string;
    password?: string;
    server?: string;
    host?: string;
    database?: string;
    schema?: string;
}

export interface IJobConfig {
    previewMode?: boolean;
}

export interface IJob {
    on(eventName: string, cb: event): void;
    run(): Promise<void>;
}

export interface IProcessorConfig {
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
    sheetName?: string;
    sheetIndex?: number;
    sheetGetter?: sheetGetter;
}

export interface IProcessor {
    process(processStream: processStream, emit: emit): Promise<void>;
}

export interface IDestination {
    loadBatch: (data: any[]) => Promise<void>;
    batchSize: number;
    recordGenerator: ((row: any) => AsyncIterableIterator<{}>) | undefined;
    batchTransformer: ((rows: any[]) => Promise<any[]>) | undefined;
    enabledInPreviewMode: boolean;
}

export interface IDestinationConfig {
    batchSize?: number;
    recordGenerator?: (row: any) => AsyncIterableIterator<{}>;
    batchTransformer?: (rows: any[]) => Promise<any[]>;
    enabledInPreviewMode?: boolean;
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
    method: 'GET' | 'POST' | 'DELETE' | 'PUT';
    uri: string;
}

export interface IStdoutDestinationConfig extends IDestinationConfig {
    asTable?: boolean;
}

export interface IHttpProcessorConfig extends IProcessorConfig {
    connection: CoreOptions & UrlOptions;
    nextRequest?: (header: any) => Promise<any>;
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

export type event = (...args: any) => Promise<void | any>;

export type sheetGetter = (sheets: string[]) => Promise<string | number>;

export type emit = (event: string, ...args: any) => Promise<void | any>;

export type processStream = (readStream: ReadStream | Readable) => Promise<any>;
