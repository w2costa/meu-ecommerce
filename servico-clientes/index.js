const express = require('express');
const mysql = require('mysql2/promise'); // Usamos a versão com Promessas/Async
const app = express();
app.use(express.json());

const PORT = 3000;

// Configuração da conexão MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'segredo',
    database: process.env.MYSQL_DATABASE || 'clientes_db'
};

// Função para iniciar conexão e tabela
async function initDB() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS clientes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255),
                email VARCHAR(255)
            )
        `);
        console.log('MySQL Conectado e Tabela Verificada!');
        return connection;
    } catch (err) {
        console.error('Aguardando MySQL...', err.message);
        // Em produção, implementaríamos um "Retry Pattern" aqui
        setTimeout(initDB, 5000); 
    }
}

let db;
initDB().then(conn => db = conn);

app.get('/clientes', async (req, res) => {
    if (!db) return res.status(500).json({ erro: 'Banco não conectado ainda' });
    const [rows] = await db.execute('SELECT * FROM clientes');
    res.json(rows);
});

app.post('/clientes', async (req, res) => {
    const { nome, email } = req.body;
    if (!db) return res.status(500).json({ erro: 'Banco não conectado ainda' });
    
    await db.execute('INSERT INTO clientes (nome, email) VALUES (?, ?)', [nome, email]);
    res.json({ mensagem: 'Cliente cadastrado' });
});

// Adicionar ao index.js de Pedidos, Catálogo e Clientes
app.get('/health', (req, res) => {
    // Aqui poderias verificar se a conexão ao DB está ativa
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`Serviço de Clientes rodando na porta ${PORT}`);
});