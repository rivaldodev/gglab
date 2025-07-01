// Importa os pacotes necessários
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const session = require('express-session');
const path = require('path'); // Importa o módulo 'path'
const bcrypt = require('bcrypt'); // Importa o bcrypt para hash de senhas

// --- Configuração Básica ---
const app = express();
const port = process.env.PORT || 3000;

// Configuração da Sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'uma-chave-secreta-muito-forte', // Em produção, use uma variável de ambiente
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Em produção, use `secure: true` com HTTPS
}));

// --- Middleware ---
// Habilita o CORS para permitir que o frontend acesse a API
app.use(cors()); 
// Habilita o parsing de JSON no corpo das requisições
app.use(express.json()); 

// --- Conexão com o Banco de Dados ---
// Cria um pool de conexões com o PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necessário para a conexão com o NeonDB
    }
});

// --- Endpoints da API ---

/**
 * @route GET /
 * @description Serve o arquivo HTML principal do quiz.
 */
app.get('/', (req, res) => {
    // Usa o path.join para criar um caminho absoluto para o arquivo HTML
    // __dirname é o diretório onde o server.js está sendo executado
    res.sendFile(path.join(__dirname, 'EVOLUCAO.html'));
});


/**
 * @route GET /api/questions
 * @description Busca todas as perguntas e suas respectivas opções no banco de dados.
 */
app.get('/api/questions', async (req, res) => {
    try {
        const query = `
            SELECT 
                q.id, 
                q.question_text, 
                json_agg(
                    json_build_object(
                        'id', o.id, 
                        'text', o.option_text
                    ) ORDER BY o.id
                ) AS options
            FROM questions q
            JOIN options o ON q.id = o.question_id
            GROUP BY q.id
            ORDER BY q.id;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar perguntas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * @route GET /api/videos
 * @description Busca todos os vídeos de estudo para exibir publicamente.
 */
app.get('/api/videos', async (req, res) => {
    console.log('LOG: Rota /api/videos foi chamada.'); // Log de acesso
    try {
        // Seleciona apenas o título e a URL, que é o necessário para o público
        const { rows } = await pool.query('SELECT title, embed_url FROM study_videos ORDER BY id');
        console.log('LOG: Vídeos encontrados no banco de dados:', rows.length); // Log de resultado
        res.json(rows);
    } catch (error) {
        console.error('ERRO: Erro ao buscar vídeos públicos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para verificar uma resposta
app.post('/api/answers', async (req, res) => {
    const { question_id, option_id } = req.body;

    if (!question_id || !option_id) {
        return res.status(400).json({ error: 'ID da pergunta e da opção são obrigatórios.' });
    }

    try {
        // Verifica se a opção selecionada é a correta
        const result = await pool.query(
            'SELECT is_correct FROM options WHERE id = $1 AND question_id = $2',
            [option_id, question_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Opção não encontrada para esta pergunta.' });
        }

        const isCorrect = result.rows[0].is_correct;

        if (isCorrect) {
            // Se estiver correta, retorna sucesso
            res.json({ correct: true });
        } else {
            // Se estiver incorreta, busca a ID da opção correta para enviar de volta
            const correctAnswerResult = await pool.query(
                'SELECT id FROM options WHERE question_id = $1 AND is_correct = TRUE',
                [question_id]
            );
            const correctOptionId = correctAnswerResult.rows[0]?.id;
            res.json({ correct: false, correctOptionId: correctOptionId });
        }
    } catch (error) {
        console.error('Erro ao verificar resposta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


/**
 * @route POST /api/quiz/submit
 * @description Salva o resultado final do quiz de um jogador.
 */
app.post('/api/quiz/submit', async (req, res) => {
    const { name, score } = req.body;

    if (!name || score === undefined) {
        return res.status(400).json({ error: 'Nome do jogador e pontuação são obrigatórios.' });
    }

    try {
        // Inicia uma transação para garantir a consistência dos dados
        await pool.query('BEGIN');

        // Verifica se o jogador já existe, senão, cria um novo
        let playerResult = await pool.query('SELECT id FROM players WHERE name = $1', [name]);
        let playerId;

        if (playerResult.rows.length > 0) {
            playerId = playerResult.rows[0].id;
        } else {
            // Insere o novo jogador e retorna seu ID
            playerResult = await pool.query('INSERT INTO players (name) VALUES ($1) RETURNING id', [name]);
            playerId = playerResult.rows[0].id;
        }

        // Insere a tentativa do quiz com o ID do jogador e a pontuação
        await pool.query(
            'INSERT INTO quiz_attempts (player_id, score) VALUES ($1, $2)',
            [playerId, score]
        );

        // Confirma a transação
        await pool.query('COMMIT');
        res.status(201).json({ message: 'Resultado do quiz salvo com sucesso.' });

    } catch (error) {
        // Em caso de erro, desfaz a transação
        await pool.query('ROLLBACK');
        console.error('Erro ao salvar resultado do quiz:', error);
        // Trata o erro de nome de jogador duplicado de forma amigável
        if (error.code === '23505') { // Código de violação de unicidade do PostgreSQL
             res.status(409).json({ error: 'O nome do jogador já existe.' });
        } else {
             res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
});

/**
 * @route GET /api/ranking
 * @description Busca os 10 melhores resultados do quiz para exibir no ranking.
 */
app.get('/api/ranking', async (req, res) => {
    console.log('LOG: Rota /api/ranking foi chamada.'); // Log de acesso
    try {
        const query = `
            SELECT 
                p.name, 
                qa.score
            FROM quiz_attempts qa
            JOIN players p ON qa.player_id = p.id
            ORDER BY qa.score DESC, qa.attempted_at ASC
            LIMIT 10;
        `;
        const { rows } = await pool.query(query);
        console.log('LOG: Ranking encontrado no banco de dados:', rows.length); // Log de resultado
        res.json(rows);
    } catch (error) {
        console.error('ERRO: Erro ao buscar ranking:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- ROTAS DE ADMIN ---

// Middleware para verificar se o usuário é um admin autenticado
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.is_admin) {
        return next(); // Se for admin, continua
    }
    res.status(403).json({ error: 'Acesso negado. Você precisa ser um administrador.' });
};

// Rota de Login
app.post('/api/login', async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
    }

    try {
        const result = await pool.query('SELECT id, name, password_hash, is_admin FROM players WHERE name = $1 AND is_admin = TRUE', [name]);
        const admin = result.rows[0];

        if (!admin) {
            return res.status(401).json({ error: 'Credenciais inválidas ou usuário não é administrador.' });
        }

        const match = await bcrypt.compare(password, admin.password_hash);

        if (match) {
            // Armazena informações do usuário na sessão
            req.session.user = { id: admin.id, name: admin.name, is_admin: admin.is_admin };
            res.json({ message: 'Login bem-sucedido.' });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas.' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota de Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Não foi possível fazer logout.' });
        }
        res.clearCookie('connect.sid'); // Limpa o cookie da sessão
        res.json({ message: 'Logout bem-sucedido.' });
    });
});

// Rota para servir a página de administração
app.get('/admin', (req, res) => {
    // A verificação de admin será feita no frontend ou com um middleware específico para a página
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API PROTEGIDA PARA GERENCIAMENTO ---

app.get('/api/admin/videos', isAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM study_videos ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar vídeos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para adicionar um novo vídeo (protegida)
app.post('/api/admin/videos', isAdmin, async (req, res) => {
    const { title, embed_url } = req.body;
    if (!title || !embed_url) {
        return res.status(400).json({ error: 'Título e URL são obrigatórios.' });
    }
    try {
        const result = await pool.query('INSERT INTO study_videos (title, embed_url) VALUES ($1, $2) RETURNING *', [title, embed_url]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao adicionar vídeo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para atualizar um vídeo (protegida)
app.put('/api/admin/videos/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, embed_url } = req.body;
    if (!title || !embed_url) {
        return res.status(400).json({ error: 'Título e URL são obrigatórios.' });
    }
    try {
        const result = await pool.query('UPDATE study_videos SET title = $1, embed_url = $2 WHERE id = $3 RETURNING *', [title, embed_url, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vídeo não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar vídeo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para deletar um vídeo (protegida)
app.delete('/api/admin/videos/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM study_videos WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Vídeo não encontrado.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        console.error('Erro ao deletar vídeo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- API PROTEGIDA PARA GERENCIAMENTO DE PERGUNTAS ---

// Rota para buscar TODAS as perguntas com detalhes (para o admin)
app.get('/api/admin/questions', isAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                q.id, 
                q.question_text, 
                json_agg(
                    json_build_object(
                        'id', o.id, 
                        'option_text', o.option_text, 
                        'is_correct', o.is_correct
                    ) ORDER BY o.id
                ) AS options
            FROM questions q
            JOIN options o ON q.id = o.question_id
            GROUP BY q.id
            ORDER BY q.id;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar perguntas para admin:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para buscar UMA pergunta com detalhes (para edição)
app.get('/api/admin/questions/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                q.id, 
                q.question_text, 
                json_agg(
                    json_build_object(
                        'id', o.id, 
                        'option_text', o.option_text, 
                        'is_correct', o.is_correct
                    ) ORDER BY o.id
                ) AS options
            FROM questions q
            JOIN options o ON q.id = o.question_id
            WHERE q.id = $1
            GROUP BY q.id;
        `;
        const { rows } = await pool.query(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Pergunta não encontrada.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar pergunta para admin:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para ADICIONAR uma nova pergunta e suas opções
app.post('/api/admin/questions', isAdmin, async (req, res) => {
    const { question_text, options } = req.body;

    if (!question_text || !options || options.length !== 4) {
        return res.status(400).json({ error: 'Texto da pergunta e 4 opções são obrigatórios.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insere a pergunta
        const questionResult = await client.query('INSERT INTO questions (question_text) VALUES ($1) RETURNING id', [question_text]);
        const newQuestionId = questionResult.rows[0].id;

        // Insere as opções
        for (const option of options) {
            await client.query(
                'INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
                [newQuestionId, option.option_text, option.is_correct]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Pergunta adicionada com sucesso', question_id: newQuestionId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao adicionar pergunta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// Rota para ATUALIZAR uma pergunta e suas opções
app.put('/api/admin/questions/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { question_text, options } = req.body;

    if (!question_text || !options || options.length !== 4) {
        return res.status(400).json({ error: 'Texto da pergunta e 4 opções são obrigatórios.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Atualiza o texto da pergunta
        await client.query('UPDATE questions SET question_text = $1 WHERE id = $2', [question_text, id]);

        // Atualiza as opções
        for (const option of options) {
            if (option.id) { // Se a opção já existe, atualiza
                await client.query(
                    'UPDATE options SET option_text = $1, is_correct = $2 WHERE id = $3 AND question_id = $4',
                    [option.option_text, option.is_correct, option.id, id]
                );
            } else { // Se for uma nova opção (não deveria acontecer no fluxo normal, mas por segurança)
                 await client.query(
                    'INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
                    [id, option.option_text, option.is_correct]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Pergunta atualizada com sucesso' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar pergunta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// Rota para DELETAR uma pergunta (as opções são deletadas em cascata)
app.delete('/api/admin/questions/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM questions WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pergunta não encontrada.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        console.error('Erro ao deletar pergunta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Inicia o Servidor ---
process.on('uncaughtException', (err) => {
    console.error('ERRO FATAL NÃO TRATADO:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('PROMESSA NÃO TRATADA:', reason);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
