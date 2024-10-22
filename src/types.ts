import { AxiosRequestConfig } from 'axios';
import { Readable } from 'stream';
import { IWorksheet } from 'xlstream/lib/types';

export interface AuthorizationRequest {
    connection: AxiosRequestConfig;
    applyTo: 'header' | 'query';
    sourceField: string;
    destinationField: string;
    prefix?: string;
}

export interface IPostgresDbConnection {
    user?: string;
    password?: string;
    host?: string;
    database?: string;
    schema?: string;
}

export interface IFirebirdDbConnection {
    port?: number;
    user?: string;
    password?: string;
    host?: string;
    database?: string;
    encoding?: string;
    useClavizNodeFirebird?: boolean;
}

export interface ITdsDriver {
    ConnectionPool: any;
    Transaction: any;
}

export interface IMssqlDbConnection {
    user?: string;
    password?: string;
    server?: string;
    database?: string;
    driver?: ITdsDriver;
    options?: any
}

export interface IMySqlDbConnection {
    user?: string;
    password?: string;
    host?: string;
    database?: string;
}

export type IDbConnection = IPostgresDbConnection | IMssqlDbConnection | IMySqlDbConnection;

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
    encoding?: string;
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
}

export interface IPostgresDestinationConfig extends IDatabaseDestinationConfig {
    connection: IPostgresDbConnection;
    upsertConstraints?: string[];
}

export interface IMssqlDestinationConfig extends IDatabaseDestinationConfig {
    connection: IMssqlDbConnection;
}

export interface IMySqlDestinationConfig extends IDatabaseDestinationConfig {
    connection: IMssqlDbConnection;
    useSourceColumns?: boolean;
}

export interface IHttpDestinationConfig extends IDestinationConfig {
    request: AxiosRequestConfig;
    authorizationRequest?: AuthorizationRequest;
}

export interface IStdoutDestinationConfig extends IDestinationConfig {
    asTable?: boolean;
}

export interface IHttpProcessorConfig extends IProcessorConfig {
    connection: AxiosRequestConfig;
    nextRequest?: () => Promise<AxiosRequestConfig | null | undefined>;
    authorizationRequest?: AuthorizationRequest;
}

export interface IXmlHttpProcessorConfig extends IHttpProcessorConfig {
    dataFormat: 'xml';
    saxOptions?: any;
}

export interface IJsonHttpProcessorConfig extends IHttpProcessorConfig {
    dataFormat: 'json';
    jsonPath?: RegExp | string;
}

export interface IDelimitedHttpProcessorConfig extends IHttpProcessorConfig {
    dataFormat: 'delimited';
    rowSeparator: string;
    delimiter?: string;
    hasHeader?: boolean;
    qualifier?: string;
    encoding?: string;
}

export interface IDatabaseProcessorConfig extends IProcessorConfig {
    query: string;
}

export interface IJsonProcessorConfig extends IDirectoryProcessorConfig {
    jsonPath?: RegExp | string;
}

export interface IDelimitedProcessorConfig extends IDirectoryProcessorConfig {
    rowSeparator: string;
    delimiter?: string;
    hasHeader?: boolean;
    qualifier?: string;
    encoding?: string;
}

export interface IMssqlProcessorConfig extends IDatabaseProcessorConfig {
    connection: IMssqlDbConnection;
}

export interface IPostgresProcessorConfig extends IDatabaseProcessorConfig {
    connection: IPostgresDbConnection;
}

export interface IFirebirdProcessorConfig extends IDatabaseProcessorConfig {
    connection: IFirebirdDbConnection;
}

export interface IMySqlProcessorConfig extends IDatabaseProcessorConfig {
    connection: IMySqlDbConnection;
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

export type DbTypes = 'postgres' | 'mssql' | 'mysql' | 'firebird';

export type event = (...args: any) => Promise<any>;
export type extendedEvent = (bellboyEvent: IBellboyEvent) => Promise<any>;

export type sheetGetter = (sheets: IWorksheet[]) => Promise<string[]>;

export type processStream = (readStream: Readable | AsyncGenerator, ...args: any) => Promise<any>;
