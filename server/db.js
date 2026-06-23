import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '88888888',
  database: 'ego-mall',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
})

export default pool
