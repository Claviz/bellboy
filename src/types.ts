import { AxiosRequestConfig } from 'axios';
import { Readable } from 'stream';
import { IWorksheet } from 'xlstream/lib/types';

export interface IDbConnection {
    user?: string;
    password?: string;
    server?: string;
    host?: string;
    database?: string;
    schema?: string;
    driver?: 'tedious' | 'msnodesqlv8';
}

export interface IReporter {
    report(job: IJob): Promise<void> | void;
}

export interface IJobConfig {
    reporters?: IReporter[];
    jobName?: string;
}

export interface IJob {
    on(eventName: string, cb: event): void;
    run(): Promise<void>;
    stop(message?: string): void;
    onAny(cb: event): void;
}

export interface IProcessorConfig {
    rowLimit?: number;
}

export interface IDynamicProcessorConfig extends IProcessorConfig {
    generator: () => AsyncIterableIterator<any>;
}

export interface IDirectoryProcessorConfig extends IProcessorConfig {
    path?: string;
    filePattern?: string;
    files?: string[];
}

export interface IExcelProcessorConfig extends IDirectoryProcessorConfig {
    hasHeader?: boolean | number;
    ignoreEmpty?: boolean;
    sheets?: ((number | string)[] | sheetGetter);
    fillMergedCells?: boolean;
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
    request: AxiosRequestConfig;
}

export interface IStdoutDestinationConfig extends IDestinationConfig {
    asTable?: boolean;
}

export interface IHttpProcessorConfig extends IProcessorConfig {
    connection: AxiosRequestConfig;
    nextRequest?: () => Promise<AxiosRequestConfig | null | undefined>;
}

export interface IJsonHttpProcessorConfig extends IHttpProcessorConfig {
    dataFormat: 'json';
    jsonPath?: RegExp;
}

export interface IDelimitedHttpProcessorConfig extends IHttpProcessorConfig {
    dataFormat: 'delimited';
    rowSeparator: string;
    delimiter?: string;
    hasHeader?: boolean;
    trimQualifier?: boolean;
    qualifier?: string;
}

export interface IDatabaseProcessorConfig extends IProcessorConfig {
    connection: any;
    query: string;
}

export interface IJsonProcessorConfig extends IDirectoryProcessorConfig {
    jsonPath?: RegExp;
}

export interface IDelimitedProcessorConfig extends IDirectoryProcessorConfig {
    rowSeparator: string;
    delimiter?: string;
    hasHeader?: boolean;
    trimQualifier?: boolean;
    qualifier?: string;
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

export interface IBellboyEvent {
    eventName: string;
    eventArguments: any;
    jobName?: string;
    jobId: string;
    eventId: string;
    timestamp: number;
    jobStopped: boolean;
}

export type DbTypes = 'postgres' | 'mssql';

export type event = (...args: any) => Promise<any>;
export type extendedEvent = (bellboyEvent: IBellboyEvent) => Promise<any>;

export type sheetGetter = (sheets: IWorksheet[]) => Promise<string[]>;

export type processStream = (readStream: Readable | AsyncGenerator, ...args: any) => Promise<any>;
