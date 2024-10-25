import { IMySqlDestinationConfig, IMySqlDbConnection } from '../types';
import { DatabaseDestination } from './base/database-destination';
import mysql from 'mysql2-stream-fix/promise';

export class MySqlDestination extends DatabaseDestination {

    protected connection: IMySqlDbConnection;
    protected useSourceColumns: boolean;
    protected postLoadQuery?: string;

    constructor(config: IMySqlDestinationConfig) {
        super(config);
        this.connection = config.connection;
        this.useSourceColumns = config.useSourceColumns || false;
        this.postLoadQuery = config.postLoadQuery;
    }

    async loadBatch(data: any[]): Promise<any> {
        const pool = mysql.createPool(this.connection);
        const dbConnection = await pool.getConnection();
        let columnNames: string[];
        if (this.useSourceColumns) {
            const uniqueColumns = new Set<string>();
            data.forEach(row => {
                Object.keys(row).forEach(key => uniqueColumns.add(key));
            });
            columnNames = Array.from(uniqueColumns).map(col => `\`${col}\``);
        } else {
            const [columns] = await dbConnection.query(`DESCRIBE ${this.table}`);
            columnNames = (columns as mysql.RowDataPacket[]).map((col) => `\`${col.Field}\``);
        }
        const insertQuery = `INSERT INTO ${this.table} (${columnNames.join(', ')}) VALUES ?`;
        await dbConnection.beginTransaction();
        let result;
        try {
            const insertData = data.map(row => columnNames.map(column => row[column.replace(/`/g, '')]));
            await dbConnection.query(insertQuery, [insertData]);
            await dbConnection.commit();
            if (this.postLoadQuery) {
                result = await dbConnection.query(this.postLoadQuery);
            }
        } catch (err) {
            await dbConnection.rollback();
            throw err;
        } finally {
            try {
                await pool.end();
            } catch (poolCloseError) {
                throw poolCloseError;
            }
        }
        return result;
    }
}