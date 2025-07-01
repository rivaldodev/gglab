-- Limpa o banco de dados, removendo as tabelas existentes.
-- A opção CASCADE remove automaticamente quaisquer objetos dependentes (como chaves estrangeiras).
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS study_videos CASCADE;

-- Cria a tabela para armazenar os jogadores.
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- Senha criptografada, pode ser NULL para jogadores normais
    is_admin BOOLEAN NOT NULL DEFAULT FALSE, -- Adicionado para identificar admins
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cria a tabela para armazenar as perguntas do quiz.
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL
);

-- Cria a tabela para armazenar as opções de resposta para cada pergunta.
CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

-- Cria a tabela para armazenar os resultados do quiz (ranking).
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cria a tabela para armazenar os vídeos de estudo
CREATE TABLE study_videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    embed_url TEXT NOT NULL
);

-- Inicia uma transação para inserir os dados do quiz.
BEGIN;

-- Insere os vídeos iniciais
INSERT INTO study_videos (id, title, embed_url) VALUES
(1, 'Vídeo 1', 'https://www.youtube.com/embed/jX2os4FQy44'),
(2, 'Vídeo 2', 'https://www.youtube.com/embed/Y9bXMlhQ_eM'),
(3, 'Vídeo 3', 'https://www.youtube.com/embed/LQcTGLUF9zc');

-- Pergunta 1
INSERT INTO questions (id, question_text) VALUES (1, 'O braço de um humano e a asa de um morcego têm a mesma origem evolutiva, mas funções diferentes. Como chamamos essas estruturas?');
INSERT INTO options (question_id, option_text, is_correct) VALUES
    (1, 'Órgãos Análogos', FALSE),
    (1, 'Órgãos Homólogos', TRUE),
    (1, 'Órgãos Vestigiais', FALSE),
    (1, 'Fósseis', FALSE);

-- Pergunta 2
INSERT INTO questions (id, question_text) VALUES (2, 'Asas de insetos e asas de aves servem para voar, mas têm origens evolutivas completamente diferentes. Isso é um exemplo de:');
INSERT INTO options (question_id, option_text, is_correct) VALUES
    (2, 'Homologia', FALSE),
    (2, 'Convergência Adaptativa (Analogia)', TRUE),
    (2, 'Órgão Vestigial', FALSE),
    (2, 'Seleção Artificial', FALSE);

-- Pergunta 3
INSERT INTO questions (id, question_text) VALUES (3, 'O que é um órgão vestigial, como o apêndice humano mencionado no vídeo?');
INSERT INTO options (question_id, option_text, is_correct) VALUES
    (3, 'Um órgão vital para a sobrevivência.', FALSE),
    (3, 'Um órgão que evoluiu recentemente.', FALSE),
    (3, 'Um órgão que perdeu sua função original ao longo da evolução.', TRUE),
    (3, 'Um órgão encontrado apenas em fósseis.', FALSE);

-- Pergunta 4
INSERT INTO questions (id, question_text) VALUES (4, 'Por que os dentes do siso são considerados uma evidência da evolução?');
INSERT INTO options (question_id, option_text, is_correct) VALUES
    (4, 'Porque eles nos ajudam a comer alimentos duros hoje.', FALSE),
    (4, 'Porque eles eram úteis para nossos ancestrais que tinham mandíbulas maiores.', TRUE),
    (4, 'Porque todo mundo nasce com eles.', FALSE),
    (4, 'Porque eles são um tipo de fóssil.', FALSE);

-- Pergunta 5
INSERT INTO questions (id, question_text) VALUES (5, 'O que é um fóssil de transição?');
INSERT INTO options (question_id, option_text, is_correct) VALUES
    (5, 'O fóssil de um animal que não deixou descendentes.', FALSE),
    (5, 'Um fóssil que mostra características de dois grupos diferentes de seres vivos (ex: répteis e aves).', TRUE),
    (5, 'Qualquer fóssil encontrado em uma camada de rocha de transição.', FALSE),
    (5, 'Um fóssil que ainda não foi completamente estudado.', FALSE);

-- Pergunta 6
INSERT INTO questions (id, question_text) VALUES (6, 'O Archaeopteryx é um famoso fóssil de transição porque ele tinha características de répteis e de aves. Qual das seguintes opções representa melhor suas características?');
INSERT INTO options (question_id, option_text, is_correct) VALUES
    (6, 'Dentes e bicos de galinha', FALSE),
    (6, 'Chifres e asas enormes', FALSE),
    (6, 'Cauda pequena e sem penas', FALSE),
    (6, 'Dentes, garras e penas (características de répteis e aves)', TRUE);

-- Insere o usuário administrador com a senha criptografada
-- A senha é 'senha123', e o hash foi gerado com bcrypt
INSERT INTO players (name, password_hash, is_admin) VALUES ('guilherme', '$2b$10$CePF0rumqF7TIV5sTyaBUeqXMmhVP4TT9LoX4/.ngW1x1BlOr0OvK', TRUE);

-- Finaliza a transação.
COMMIT;

-- SINCRONIZAÇÃO DAS SEQUÊNCIAS
-- Sincroniza a sequência de IDs da tabela 'players' com o valor máximo de ID existente.
-- Isso é crucial porque inserimos um admin manualmente com um ID específico.
SELECT setval(pg_get_serial_sequence('players', 'id'), COALESCE((SELECT MAX(id) FROM players), 1), false);

-- Sincroniza a sequência de IDs da tabela 'questions' com o valor máximo de ID existente.
-- Necessário porque as perguntas foram inseridas manualmente com IDs específicos.
SELECT setval(pg_get_serial_sequence('questions', 'id'), COALESCE((SELECT MAX(id) FROM questions), 1));

-- Sincroniza a sequência de IDs da tabela 'study_videos' com o valor máximo de ID existente.
-- Essencial para evitar o erro de "chave duplicada" ao adicionar novos vídeos pelo painel de admin.
SELECT setval(pg_get_serial_sequence('study_videos', 'id'), COALESCE((SELECT MAX(id) FROM study_videos), 1));
