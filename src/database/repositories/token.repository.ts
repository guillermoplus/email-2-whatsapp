import {SqliteDatabase} from "../data-source";
import {TokenEntity} from "../entities/token.entity";

export class TokenRepository {
  private readonly _tableName = 'tokens';
  private readonly _dbConnection: SqliteDatabase;

  constructor(opts: any) {
    this._dbConnection = opts.dbConnection;
  }

  async query(query: string, params: any[]) {
    const rows = await this._dbConnection.all(query, params);
    return rows;
  }

  async save({
               access_token,
               refresh_token,
               expires_in,
               ext_expires_in,
               scope,
               token_type,
             }: TokenEntity) {
    const query = `INSERT INTO ${this._tableName}
                   (token_type, access_token, refresh_token, expires_in, scope, ext_expires_in)
                   VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [token_type, access_token, refresh_token, expires_in, scope, ext_expires_in];
    const result = await this._dbConnection.run(query, params);
    return result;
  }

  async find({
               id,
               access_token
             }: { id?: number; access_token?: string }) {
    const query = id ? `SELECT *
                        FROM ${this._tableName}
                        WHERE id = ?` : `SELECT *
                                         FROM ${this._tableName}
                                         WHERE access_token = ?`;
    const params = id ? [id] : [access_token];
    const rows = await this._dbConnection.all(query, params);
    return rows;
  }

  async delete({id, token}: { id?: number, token?: string }) {
    if (!id && !token) {
      throw new Error('Either id or token is required.');
    }
    const query = id ? `DELETE
                        FROM ${this._tableName}
                        WHERE id = ?` : `DELETE
                                         FROM ${this._tableName}
                                         WHERE token = ?`;
    const params = id ? [id] : [token];
    const result = await this._dbConnection.run(query, params);
    return result;
  }

  async getLatestToken(): Promise<TokenEntity> {
    const query = `SELECT *
                   FROM ${this._tableName}
                   ORDER BY created_at DESC LIMIT 1`;
    const rows = await this._dbConnection.all(query);
    return rows[0];
  }
}
