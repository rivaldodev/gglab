// setup.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Configura o pool de conexão usando a variável de ambiente
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupDatabase() {
    console.log('Iniciando configuração do banco de dados...');

    // DEBUG: Verifica se a variável de ambiente está definida na Vercel
    if (!process.env.DATABASE_URL) {
        console.error('ERRO FATAL: A variável de ambiente DATABASE_URL não foi encontrada!');
        console.error('Por favor, configure as Environment Variables no painel do seu projeto na Vercel.');
        process.exit(1); // Interrompe o build com um erro claro
    }

    const client = await pool.connect();
    console.log('Conectado ao banco de dados com sucesso.');

    try {
        console.log('Lendo o arquivo setup_db.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'setup_db.sql'), 'utf8');
        
        console.log('Executando o script SQL. Isso pode levar um momento...');
        // O pg permite executar múltiplos comandos de uma vez se estiverem em uma única string
        await client.query(sql);
        console.log('Banco de dados configurado com sucesso! As tabelas foram criadas e populadas.');
    } catch (err) {
        console.error('Erro durante a configuração do banco de dados:', err);
        // Adiciona um log mais detalhado do erro
        if (err.stack) {
            console.error(err.stack);
        }
    } finally {
        // Garante que o cliente seja liberado de volta para o pool
        await client.release();
        console.log('Cliente de banco de dados liberado.');
        // Não vamos mais fechar o pool aqui para que o servidor possa usá-lo.
        // await pool.end(); 
    }
}

// Exporta a função para que possa ser usada em outros arquivos (como o server.js)
module.exports = { setupDatabase };

// Executa a função de setup apenas se o script for chamado diretamente
if (require.main === module) {
    setupDatabase().finally(() => {
        pool.end();
        console.log('Pool de conexão com o banco de dados fechado.');
    });
}
