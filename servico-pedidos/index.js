const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const app = express();
app.use(express.json()); // Permitir receber JSON no POST

const PORT = 3000;

// Configuração do Banco de Dados Postgres
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASS || 'segredo',
    database: process.env.POSTGRES_DB || 'pedidos_db',
    port: 5432,
});

// URL do outro microserviço
const CATALOGO_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001/produtos';

// Inicialização: Criar Tabela se não existir
pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INT,
        produto_nome VARCHAR(255),
        preco_pago DECIMAL(10,2),
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(err => console.error('Erro ao criar tabela:', err));

// Rota: Criar Pedido
app.post('/pedidos', async (req, res) => {
    const { clienteId, produtoId } = req.body;

    try {
        // 1. Comunicar com o Serviço de Catálogo para pegar dados atuais
        console.log(`Buscando produto ${produtoId} no catálogo...`);
        const response = await axios.get(`${CATALOGO_URL}/${produtoId}`);
        const produto = response.data;

        if (!produto) {
            return res.status(404).json({ erro: 'Produto indisponível' });
        }

        // 2. Inserir no Postgres (Copiando o nome e preço - Snapshot)
        const query = 'INSERT INTO pedidos(cliente_id, produto_nome, preco_pago) VALUES($1, $2, $3) RETURNING *';
        const values = [clienteId, produto.nome, produto.preco];
        
        const resultado = await pool.query(query, values);

        res.json({
            mensagem: 'Pedido criado com sucesso!',
            pedido: resultado.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao processar pedido' });
    }
});

// Rota: Listar Pedidos
app.get('/pedidos', async (req, res) => {
    const resultado = await pool.query('SELECT * FROM pedidos');
    res.json(resultado.rows);
});

// --- NOVO HEALTH CHECK (Teste de Conexão Real) ---
app.get('/health', async (req, res) => {
    try {
        // Tenta fazer uma query simples e rápida
        await pool.query('SELECT 1');
        
        // Se não deu erro, o banco está vivo e a responder
        res.status(200).send('OK - Banco Conectado');
    } catch (error) {
        // Se caiu aqui, o banco está em baixo, senha errada ou rede cortada.
        // O Kubernetes receberá erro 500 e saberá que algo está errado.
        console.error('Health Check Falhou:', error.message);
        res.status(500).send('ERRO - Banco Indisponível');
    }
});

// // Rota da Morte: Simula um travamento da CPU
// app.get('/travado', (req, res) => {
//     console.log('Recebi pedido para travar. Bloqueando o Event Loop por 15s...');
    
//     const stop = Date.now() + 15000; // 15 segundos no futuro
    
//     // Loop Síncrono: O Node.js não consegue fazer MAIS NADA enquanto isto roda
//     while (Date.now() < stop) {
//         // CPU a 100%, loop vazio
//     }
    
//     res.send('Desbloqueado (se ainda estiver vivo)!');
// });

app.listen(PORT, () => {
    console.log(`Serviço de Pedidos rodando na porta ${PORT}`);
});