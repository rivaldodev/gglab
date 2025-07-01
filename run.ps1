# Este script automatiza a configuração e execução do backend.

# 1. Instala as dependências do projeto listadas no package.json
echo "Instalando dependências..."
npm install

# 2. Executa o script SQL para limpar e popular o banco de dados
echo "Configurando o banco de dados..."
node .\setup.js

# 3. Inicia o servidor backend
echo "Iniciando o servidor..."
npm start
