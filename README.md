# Quiz de Evolução - GGLAB

Este é um projeto de um sistema de quiz interativo sobre a teoria da evolução, construído com um backend Node.js/Express, um frontend em HTML com Tailwind CSS e um banco de dados PostgreSQL. O projeto inclui um painel de administração para gerenciar o conteúdo do quiz e uma interface para os usuários responderem às perguntas e verem um ranking.

## ✨ Funcionalidades

- **Quiz Interativo:** Os usuários podem inserir um nome e responder a uma série de perguntas de múltipla escolha.
- **Feedback Imediato:** O sistema informa se a resposta está correta ou incorreta na hora.
- **Ranking de Pontuação:** Os 10 melhores jogadores são exibidos em um ranking na página inicial.
- **Painel de Estudo:** A página inicial exibe vídeos do YouTube sobre o tema, que são cadastrados pelo administrador.
- **Painel de Administração:** Uma área protegida por login (`/admin`) onde o administrador pode:
    - Gerenciar (Criar, Ler, Atualizar, Deletar) as perguntas do quiz.
    - Gerenciar (Criar, Ler, Atualizar, Deletar) os vídeos de estudo.
- **Backend RESTful:** Uma API robusta para servir o conteúdo para o frontend.
- **Setup Automatizado:** Um único script para instalar dependências e configurar o banco de dados.

## 🚀 Tecnologias Utilizadas

- **Backend:**
    - [Node.js](https://nodejs.org/)
    - [Express.js](https://expressjs.com/)
    - [PostgreSQL](https://www.postgresql.org/)
    - [NeonDB](https://neon.tech/) (para hospedagem do PostgreSQL)
    - `node-postgres` (pg) para a conexão com o banco.
    - `dotenv` para gerenciamento de variáveis de ambiente.
    - `cors` para habilitar o acesso do frontend.
    - `bcrypt` para hashing de senhas.
    - `express-session` para autenticação do admin.

- **Frontend:**
    - HTML5
    - [Tailwind CSS](https://tailwindcss.com/) para estilização.
    - JavaScript (vanilla) para interatividade e comunicação com a API.

## 📋 Pré-requisitos

Antes de começar, você vai precisar ter instalado em sua máquina:
- [Node.js (versão 14 ou superior)](https://nodejs.org/)
- [npm](https://www.npmjs.com/) (geralmente vem com o Node.js)

## ⚙️ Instalação e Execução

Siga os passos abaixo para configurar e rodar o projeto localmente.

**1. Clone o Repositório (ou baixe os arquivos)**

Se estivesse em um repositório git, você clonaria. No nosso caso, certifique-se de ter todos os arquivos do projeto em uma pasta.

**2. Crie o arquivo de ambiente (`.env`)**

Crie um arquivo chamado `.env` na raiz do projeto e adicione sua string de conexão com o banco de dados NeonDB. 

*Exemplo de `.env`:*
```
DATABASE_URL='postgresql://USUARIO:SENHA@HOST/NOME_DO_BANCO?sslmode=require'
SESSION_SECRET='uma-chave-secreta-bem-segura-para-as-sessoes'
```

**3. Execute o Script de Setup e Inicialização**

Abra um terminal (de preferência PowerShell, pois o script `run.ps1` foi feito para ele) na pasta do projeto e execute o seguinte comando:

```powershell
.\run.ps1
```

Este comando fará três coisas:
1.  `npm install`: Instalará todas as dependências do Node.js.
2.  `node .\setup.js`: Executará o script que cria as tabelas e insere os dados iniciais no banco de dados.
3.  `npm start`: Iniciará o servidor backend.

O terminal deverá exibir a mensagem `Servidor rodando em http://localhost:3000`.

## 🎮 Como Usar

### Página Principal (Quiz)

- Abra seu navegador e acesse: **[http://localhost:3000](http://localhost:3000)**
- Você verá a página inicial com os vídeos de estudo e o ranking.
- Digite seu nome e clique em "Começar o Quiz" para jogar.

### Painel de Administração

- Acesse: **[http://localhost:3000/admin](http://localhost:3000/admin)**
- Use as seguintes credenciais para fazer o login:
    - **Usuário:** `guilherme`
    - **Senha:** `senha123`
- Após o login, você poderá gerenciar as perguntas e os vídeos do quiz.

## 📂 Estrutura de Arquivos

```
.gglab/
├── .env                # Arquivo com as variáveis de ambiente (NÃO versionar)
├── .gitignore          # Arquivo para ignorar arquivos e pastas no Git
├── EVOLUCAO.html       # Frontend principal do quiz
├── admin.html          # Frontend do painel de administração
├── package.json        # Define os metadados e dependências do projeto
├── run.ps1             # Script para automatizar a instalação e execução
├── server.js           # Arquivo principal do backend (servidor Express)
├── setup.js            # Script para configurar o banco de dados
├── setup_db.sql        # Script SQL para criar e popular as tabelas
└── node_modules/       # Pasta com as dependências (gerada pelo npm)
```
