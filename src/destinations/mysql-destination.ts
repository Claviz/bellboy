import { IMySqlDestinationConfig, IMySqlDbConnection } from '../types';
import { DatabaseDestination } from './base/database-destination';
import mysql from 'mysql2-stream-fix/promise';

export class MySqlDestination extends DatabaseDestination {

    protected connection: IMySqlDbConnection;

    constructor(config: IMySqlDestinationConfig) {
        super(config);
        this.connection = config.connection;
    }

    async loadBatch(data: any[]) {
        const pool = mysql.createPool(this.connection);
        const dbConnection = await pool.getConnection();
        const [columns] = await dbConnection.query(`DESCRIBE ${this.table}`);
        const columnNames = (columns as mysql.RowDataPacket[]).map((col) => `\`${col.Field}\``);
        const insertQuery = `INSERT INTO ${this.table} (${columnNames.join(', ')}) VALUES ?`;
        await dbConnection.beginTransaction();
        try {
            const insertData = data.map(row => columnNames.map(column => row[column.replace(/`/g, '')])); // Remove backticks when accessing row data
            await dbConnection.beginTransaction();
            await dbConnection.query(insertQuery, [insertData]);
            await dbConnection.commit();
        } catch (err) {
            await dbConnection.rollback();
            throw err;
        } finally {
            await pool.end();
        }
    }
}
