import {SqliteDatabase} from '../data-source';
import {MessageEntity, MessageStatus} from '../entities/message.entity';

export class MessageRepository {
  private readonly _tableName = 'messages';
  private readonly _dbConnection: SqliteDatabase;

  constructor(opts: { dbConnection: SqliteDatabase }) {
    this._dbConnection = opts.dbConnection;
  }

  /**
   * Executes a custom query on the database.
   * @param query - SQL query string.
   * @param params - Array of parameters for the query.
   * @returns Array of result rows.
   */
  async query(query: string, params: any[]) {
    return await this._dbConnection.all(query, params);
  }

  /**
   * Inserts a new message into the database.
   * @param messageData - Partial data for creating a message.
   * @returns The created message entity with ID.
   */
  async save({
               message,
               status,
               sent_at,
               scheduled_at,
             }: Partial<MessageEntity>): Promise<MessageEntity> {
    const created_at = new Date().toISOString();
    const updated_at = created_at;
    const query = `INSERT INTO ${this._tableName} (message, status, sent_at, scheduled_at, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [
      message,
      status,
      sent_at ? sent_at.toISOString() : null,
      scheduled_at ? scheduled_at.toISOString() : null,
      created_at,
      updated_at,
    ];
    const result = await this._dbConnection.run(query, params);

    return {
      id: result.lastID,
      message,
      status,
      sent_at,
      scheduled_at,
      created_at: new Date(created_at),
      updated_at: new Date(updated_at),
    } as MessageEntity;
  }

  /**
   * Updates the status, sent_at, and updated_at fields of a message.
   * @param id - The ID of the message to update.
   * @param status - New status for the message.
   * @param sent_at - Date when the message was sent.
   * @returns The updated message entity or null if not found.
   */
  async updateStatusAndDates(
    id: number,
    status: MessageStatus,
    sent_at?: Date
  ): Promise<MessageEntity | null> {
    const updated_at = new Date().toISOString();
    const query = `UPDATE ${this._tableName}
                   SET status     = ?,
                       sent_at    = ?,
                       updated_at = ?
                   WHERE id = ?`;
    const params = [
      status,
      sent_at ? sent_at.toISOString() : null,
      updated_at,
      id,
    ];
    const result = await this._dbConnection.run(query, params);

    if (result.changes === 0) {
      return null;
    }

    const updatedMessage = await this._dbConnection.get<MessageEntity>(
      `SELECT *
       FROM ${this._tableName}
       WHERE id = ?`,
      [id]
    );
    return updatedMessage ?? null;
  }

  /**
   * Find messages by month.
   * @param month - The month number (1-12).
   * @returns Array of messages created in the specified month.
   */
  async findMessagesByMonth(month: number) {
    const query = `SELECT *
                   FROM ${this._tableName}
                   WHERE strftime('%m', created_at) = ?`;
    return await this._dbConnection.all<MessageEntity[]>(query, [month.toString()]);
  }
}
