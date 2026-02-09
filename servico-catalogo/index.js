const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Configuração da conexão (Vem das variáveis de ambiente do K8s/Docker)
const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/catalogo';
const PORT = 3000;

// Modelo do Produto (Schema NoSQL)
const ProdutoSchema = new mongoose.Schema({
    nome: String,
    descricao: String,
    preco: Number,
    categorias: [String]
});
const Produto = mongoose.model('Produto', ProdutoSchema);

// Conectar ao MongoDB
mongoose.connect(DB_URI)
    .then(() => console.log('MongoDB Conectado!'))
    .catch(err => console.error('Erro ao conectar ao Mongo:', err));

// Rota para listar produtos
app.get('/produtos', async (req, res) => {
    const produtos = await Produto.find();
    res.json(produtos);
});

// Rota para buscar um produto específico (usado pelo serviço de pedidos)
app.get('/produtos/:id', async (req, res) => {
    try {
        const produto = await Produto.findById(req.params.id);
        res.json(produto);
    } catch (error) {
        res.status(404).json({ erro: 'Produto não encontrado' });
    }
});

// Adicionar ao index.js de Pedidos, Catálogo e Clientes
app.get('/health', (req, res) => {
    // Aqui poderias verificar se a conexão ao DB está ativa
    res.status(200).send('OK');
});

// Iniciar o servidor e popular dados de teste
app.listen(PORT, async () => {
    console.log(`Serviço de Catálogo rodando na porta ${PORT}`);
    
    // Seed: Se não houver produtos, cria alguns
    const count = await Produto.countDocuments();
    if (count === 0) {
        await Produto.create([
            { nome: 'Notebook Gamer', preco: 1500, categorias: ['Eletrônicos'] },
            { nome: 'Teclado Mecânico', preco: 100, categorias: ['Periféricos'] },
            { nome: 'Monitor 4K', preco: 400, categorias: ['Eletrônicos'] }
        ]);
        console.log('Dados de teste inseridos no MongoDB!');
    }
});
