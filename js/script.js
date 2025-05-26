class Pessoa {
    constructor(nome, email, telefone) {
        this.nome = nome;
        this.email = email;
        this.telefone = telefone;
        this.dataCadastro = new Date();
    }

    validarEmail() {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(this.email);
    }
}

class Usuario extends Pessoa {
    static contadorId = 1;

    constructor(nome, email, telefone, tipo) {
        super(nome, email, telefone);
        this.id = Usuario.contadorId++;
        this.tipo = tipo;
        this.emprestimosAtivos = [];
        this.historicoEmprestimos = [];
        this.ativo = true;
    }

    podeEmprestar() {
        const limites = {
            'Estudante': 3,
            'Professor': 5,
            'Funcionário': 4,
            'Público Geral': 2
        };
        return this.emprestimosAtivos.length < (limites[this.tipo] || 2);
    }

    adicionarEmprestimo(emprestimo) {
        this.emprestimosAtivos.push(emprestimo);
        this.historicoEmprestimos.push(emprestimo);
    }

    removerEmprestimo(emprestimoId) {
        this.emprestimosAtivos = this.emprestimosAtivos.filter(e => e.id !== emprestimoId);
    }
}

class Autor {
    constructor(nome, nacionalidade = '') {
        this.nome = nome;
        this.nacionalidade = nacionalidade;
        this.livros = [];
    }
}

class Categoria {
    constructor(nome, descricao = '') {
        this.nome = nome;
        this.descricao = descricao;
        this.livros = [];
    }
}

class Livro {
    static contadorId = 1;

    constructor(titulo, autor, anoPublicacao, categoria, numeroCopias = 1) {
        this.id = Livro.contadorId++;
        this.titulo = titulo;
        this.autor = autor;
        this.anoPublicacao = anoPublicacao;
        this.categoria = categoria;
        this.numeroCopias = numeroCopias;
        this.copiasDisponiveis = numeroCopias;
        this.emprestimos = [];
        this.dataAdicao = new Date();
    }

    estaDisponivel() {
        return this.copiasDisponiveis > 0;
    }

    emprestar() {
        if (this.estaDisponivel()) {
            this.copiasDisponiveis--;
            return true;
        }
        return false;
    }

    devolver() {
        if (this.copiasDisponiveis < this.numeroCopias) {
            this.copiasDisponiveis++;
            return true;
        }
        return false;
    }

    getStatus() {
        if (this.copiasDisponiveis === 0) return 'Indisponível';
        if (this.copiasDisponiveis < this.numeroCopias) return 'Parcialmente Disponível';
        return 'Disponível';
    }
}

class Emprestimo {
    static contadorId = 1;

    constructor(usuario, livro, dataDevolucao) {
        this.id = Emprestimo.contadorId++;
        this.usuario = usuario;
        this.livro = livro;
        this.dataEmprestimo = new Date();
        this.dataPrevistaDevolucao = new Date(dataDevolucao);
        this.dataRealDevolucao = null;
        this.status = 'Ativo';
        this.multa = 0;
    }

    calcularMulta() {
        if (this.status === 'Devolvido') return 0;

        const hoje = new Date();
        const diasAtraso = Math.floor((hoje - this.dataPrevistaDevolucao) / (1000 * 60 * 60 * 24));

        if (diasAtraso > 0) {
            this.status = 'Atrasado';
            this.multa = diasAtraso * 2.00;
        }

        return this.multa;
    }

    devolver() {
        this.dataRealDevolucao = new Date();
        this.status = 'Devolvido';
        this.calcularMulta();
        this.livro.devolver();
        this.usuario.removerEmprestimo(this.id);
    }

    estaAtrasado() {
        if (this.status === 'Devolvido') return false;
        return new Date() > this.dataPrevistaDevolucao;
    }
}

class BibliotecaDB {
    constructor() {
        this.usuarios = [];
        this.livros = [];
        this.emprestimos = [];
        this.autores = [];
        this.categorias = [];
        this.carregarDados();
    }

    carregarDados() {
        try {
            const dadosSalvos = JSON.parse(window.localStorage?.getItem('bibliotecaDB')) || null;

            if (dadosSalvos) {
                Usuario.contadorId = dadosSalvos.contadores?.Usuario || 1;
                Livro.contadorId = dadosSalvos.contadores?.Livro || 1;
                Emprestimo.contadorId = dadosSalvos.contadores?.Emprestimo || 1;

                if (dadosSalvos.usuarios) {
                    dadosSalvos.usuarios.forEach(userData => {
                        const usuario = Object.assign(new Usuario(), userData);
                        usuario.dataCadastro = new Date(usuario.dataCadastro);
                        this.usuarios.push(usuario);
                    });
                }

                if (dadosSalvos.livros) {
                    dadosSalvos.livros.forEach(livroData => {
                        const livro = Object.assign(new Livro(), livroData);
                        livro.dataAdicao = new Date(livro.dataAdicao);
                        this.livros.push(livro);
                    });
                }

                if (dadosSalvos.emprestimos) {
                    dadosSalvos.emprestimos.forEach(emprestimoData => {
                        const emprestimo = Object.assign(new Emprestimo(), emprestimoData);
                        emprestimo.dataEmprestimo = new Date(emprestimo.dataEmprestimo);
                        emprestimo.dataPrevistaDevolucao = new Date(emprestimo.dataPrevistaDevolucao);
                        if (emprestimo.dataRealDevolucao) {
                            emprestimo.dataRealDevolucao = new Date(emprestimo.dataRealDevolucao);
                        }

                        emprestimo.usuario = this.usuarios.find(u => u.id === emprestimoData.usuarioId);
                        emprestimo.livro = this.livros.find(l => l.id === emprestimoData.livroId);

                        if (emprestimo.usuario && emprestimo.livro) {
                            this.emprestimos.push(emprestimo);

                            if (emprestimo.status === 'Ativo' || emprestimo.status === 'Atrasado') {
                                emprestimo.usuario.emprestimosAtivos.push(emprestimo);
                            }
                            emprestimo.usuario.historicoEmprestimos.push(emprestimo);
                        }
                    });
                }

                console.log('Dados carregados com sucesso!');
            } else {
                this.inicializarDadosExemplo();
            }
        } catch (error) {
            console.warn('Erro ao carregar dados salvos, inicializando com dados de exemplo:', error);
            this.inicializarDadosExemplo();
        }
    }

    inicializarDadosExemplo() {
        this.adicionarUsuario(new Usuario('João Silva', 'joao@email.com', '(11) 99999-9999', 'Estudante'));
        this.adicionarUsuario(new Usuario('Maria Santos', 'maria@email.com', '(11) 88888-8888', 'Professor'));

        this.adicionarLivro(new Livro('Clean Code', 'Robert C. Martin', 2008, 'Técnico', 3));
        this.adicionarLivro(new Livro('1984', 'George Orwell', 1949, 'Ficção', 2));

        this.salvarDados();
    }

    salvarDados() {
        try {
            const dadosParaSalvar = {
                contadores: {
                    Usuario: Usuario.contadorId,
                    Livro: Livro.contadorId,
                    Emprestimo: Emprestimo.contadorId
                },
                usuarios: this.usuarios.map(usuario => ({
                    ...usuario,
                    emprestimosAtivos: [],
                    historicoEmprestimos: []
                })),
                livros: this.livros,
                emprestimos: this.emprestimos.map(emprestimo => ({
                    ...emprestimo,
                    usuarioId: emprestimo.usuario.id,
                    livroId: emprestimo.livro.id,
                    usuario: null,
                    livro: null
                }))
            };

            if (window.localStorage) {
                window.localStorage.setItem('bibliotecaDB', JSON.stringify(dadosParaSalvar));
                console.log('Dados salvos com sucesso!');
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            mostrarMensagem('Erro ao salvar dados: ' + error.message, 'error');
        }
    }

    adicionarUsuario(usuario) {
        if (!usuario.validarEmail()) {
            throw new Error('Email inválido');
        }
        this.usuarios.push(usuario);
        this.salvarDados();
        return usuario;
    }

    adicionarLivro(livro) {
        this.livros.push(livro);
        this.salvarDados();
        return livro;
    }

    realizarEmprestimo(usuarioId, livroId, dataDevolucao) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        const livro = this.livros.find(l => l.id === livroId);

        if (!usuario) throw new Error('Usuário não encontrado');
        if (!livro) throw new Error('Livro não encontrado');
        if (!usuario.podeEmprestar()) throw new Error('Usuário atingiu limite de empréstimos');
        if (!livro.estaDisponivel()) throw new Error('Livro não disponível');

        if (livro.emprestar()) {
            const emprestimo = new Emprestimo(usuario, livro, dataDevolucao);
            this.emprestimos.push(emprestimo);
            usuario.adicionarEmprestimo(emprestimo);
            this.salvarDados();
            return emprestimo;
        }
        throw new Error('Erro ao realizar empréstimo');
    }

    realizarDevolucao(emprestimoId) {
        const emprestimo = this.emprestimos.find(e => e.id === emprestimoId);
        if (!emprestimo) throw new Error('Empréstimo não encontrado');
        if (emprestimo.status === 'Devolvido') throw new Error('Livro já foi devolvido');

        emprestimo.devolver();
        this.salvarDados();
        return emprestimo;
    }

    buscarLivro(termo) {
        return this.livros.filter(livro =>
            livro.titulo.toLowerCase().includes(termo.toLowerCase()) ||
            livro.autor.toLowerCase().includes(termo.toLowerCase())
        );
    }

    getEstatisticas() {
        const emprestimosAtivos = this.emprestimos.filter(e => e.status === 'Ativo').length;
        const emprestimosAtrasados = this.emprestimos.filter(e => e.estaAtrasado()).length;
        const totalLivros = this.livros.length;
        const totalUsuarios = this.usuarios.length;
        const livrosDisponiveis = this.livros.filter(l => l.estaDisponivel()).length;

        return {
            totalLivros,
            totalUsuarios,
            emprestimosAtivos,
            emprestimosAtrasados,
            livrosDisponiveis
        };
    }

    getLivrosAtrasados() {
        return this.emprestimos.filter(e => e.estaAtrasado() && e.status !== 'Devolvido');
    }
}

const biblioteca = new BibliotecaDB();

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');

    if (tabId === 'dashboard') {
        atualizarDashboard();
    } else if (tabId === 'emprestimos') {
        carregarSelectsEmprestimo();
    }
}

function limparTodosDados() {
    if (confirm('⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados do sistema (usuários, livros e empréstimos). Esta ação não pode ser desfeita. Deseja continuar?')) {
        if (window.localStorage) {
            window.localStorage.removeItem('bibliotecaDB');
        }
        location.reload();
    }
}

function exportarDados() {
    try {
        const dados = window.localStorage?.getItem('bibliotecaDB') || '{}';
        const blob = new Blob([dados], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `biblioteca_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        mostrarMensagem('Backup exportado com sucesso!', 'success');
    } catch (error) {
        mostrarMensagem('Erro ao exportar dados: ' + error.message, 'error');
    }
}

function atualizarDashboard() {
    const stats = biblioteca.getEstatisticas();
    const statsGrid = document.getElementById('statsGrid');

    statsGrid.innerHTML = `
                <div class="stat-card">
                    <h3>${stats.totalLivros}</h3>
                    <p>Total de Livros</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalUsuarios}</h3>
                    <p>Usuários Cadastrados</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.emprestimosAtivos}</h3>
                    <p>Empréstimos Ativos</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.emprestimosAtrasados}</h3>
                    <p>Livros em Atraso</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.livrosDisponiveis}</h3>
                    <p>Livros Disponíveis</p>
                </div>
            `;

    const alertsContainer = document.getElementById('alertsContainer');
    if (stats.emprestimosAtrasados > 0) {
        alertsContainer.innerHTML = `
                    <div class="alert alert-error">
                        ⚠️ Atenção: Existem ${stats.emprestimosAtrasados} livros em atraso!
                    </div>
                `;
    } else {
        alertsContainer.innerHTML = `
                    <div class="alert alert-success">
                        ✅ Todos os empréstimos estão em dia!
                    </div>
                `;
    }

    alertsContainer.innerHTML += `
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="exportarDados()">💾 Exportar Backup</button>
                    <button class="btn btn-warning" onclick="limparTodosDados()" style="margin-left: 10px;">🗑️ Limpar Todos os Dados</button>
                </div>
            `;
}

function adicionarLivro() {
    try {
        const titulo = document.getElementById('tituloLivro').value;
        const autor = document.getElementById('autorLivro').value;
        const ano = parseInt(document.getElementById('anoLivro').value);
        const categoria = document.getElementById('categoriaLivro').value;
        const copias = parseInt(document.getElementById('copiasLivro').value);

        if (!titulo || !autor || !ano || !categoria) {
            throw new Error('Todos os campos são obrigatórios');
        }

        const livro = new Livro(titulo, autor, ano, categoria, copias);
        biblioteca.adicionarLivro(livro);

        document.getElementById('tituloLivro').value = '';
        document.getElementById('autorLivro').value = '';
        document.getElementById('anoLivro').value = '';
        document.getElementById('categoriaLivro').value = '';
        document.getElementById('copiasLivro').value = '1';

        mostrarMensagem('Livro adicionado com sucesso!', 'success');
        listarLivros();
        atualizarDashboard();
    } catch (error) {
        mostrarMensagem(error.message, 'error');
    }
}

function adicionarUsuario() {
    try {
        const nome = document.getElementById('nomeUsuario').value;
        const email = document.getElementById('emailUsuario').value;
        const telefone = document.getElementById('telefoneUsuario').value;
        const tipo = document.getElementById('tipoUsuario').value;

        if (!nome || !email || !telefone) {
            throw new Error('Todos os campos são obrigatórios');
        }

        const usuario = new Usuario(nome, email, telefone, tipo);
        biblioteca.adicionarUsuario(usuario);

        document.getElementById('nomeUsuario').value = '';
        document.getElementById('emailUsuario').value = '';
        document.getElementById('telefoneUsuario').value = '';
        document.getElementById('tipoUsuario').value = 'Estudante';

        mostrarMensagem('Usuário adicionado com sucesso!', 'success');
        listarUsuarios();
        atualizarDashboard();
    } catch (error) {
        mostrarMensagem(error.message, 'error');
    }
}

function listarLivros() {
    const tabela = document.getElementById('tabelaLivros');
    const corpo = document.getElementById('corpoTabelaLivros');

    corpo.innerHTML = '';

    biblioteca.livros.forEach(livro => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>${livro.id}</td>
                    <td>${livro.titulo}</td>
                    <td>${livro.autor}</td>
                    <td>${livro.categoria}</td>
                    <td><span class="status ${livro.estaDisponivel() ? 'disponivel' : 'emprestado'}">${livro.getStatus()}</span></td>
                    <td>${livro.copiasDisponiveis}/${livro.numeroCopias}</td>
                `;
        corpo.appendChild(row);
    });

    tabela.style.display = 'table';
}

function listarUsuarios() {
    const tabela = document.getElementById('tabelaUsuarios');
    const corpo = document.getElementById('corpoTabelaUsuarios');

    corpo.innerHTML = '';

    biblioteca.usuarios.forEach(usuario => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>${usuario.id}</td>
                    <td>${usuario.nome}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.telefone}</td>
                    <td>${usuario.tipo}</td>
                    <td>${usuario.emprestimosAtivos.length}</td>
                `;
        corpo.appendChild(row);
    });

    tabela.style.display = 'table';
}

function carregarSelectsEmprestimo() {
    const selectUsuario = document.getElementById('usuarioEmprestimo');
    const selectLivro = document.getElementById('livroEmprestimo');

    selectUsuario.innerHTML = '<option value="">Selecione um usuário</option>';
    biblioteca.usuarios.forEach(usuario => {
        if (usuario.podeEmprestar()) {
            selectUsuario.innerHTML += `<option value="${usuario.id}">${usuario.nome}</option>`;
        }
    });

    selectLivro.innerHTML = '<option value="">Selecione um livro</option>';
    biblioteca.livros.forEach(livro => {
        if (livro.estaDisponivel()) {
            selectLivro.innerHTML += `<option value="${livro.id}">${livro.titulo} (${livro.copiasDisponiveis} disponíveis)</option>`;
        }
    });

    const dataDefault = new Date();
    dataDefault.setDate(dataDefault.getDate() + 15);
    document.getElementById('dataDevolucao').value = dataDefault.toISOString().split('T')[0];
}

function realizarEmprestimo() {
    try {
        const usuarioId = parseInt(document.getElementById('usuarioEmprestimo').value);
        const livroId = parseInt(document.getElementById('livroEmprestimo').value);
        const dataDevolucao = document.getElementById('dataDevolucao').value;

        if (!usuarioId || !livroId || !dataDevolucao) {
            throw new Error('Todos os campos são obrigatórios');
        }

        const emprestimo = biblioteca.realizarEmprestimo(usuarioId, livroId, dataDevolucao);

        mostrarMensagem(`Empréstimo realizado com sucesso! ID: ${emprestimo.id}`, 'success');
        carregarSelectsEmprestimo();
        listarEmprestimos();
        atualizarDashboard();
    } catch (error) {
        mostrarMensagem(error.message, 'error');
    }
}

function realizarDevolucao() {
    const emprestimoId = prompt('Digite o ID do empréstimo para devolução:');

    if (emprestimoId) {
        try {
            const emprestimo = biblioteca.realizarDevolucao(parseInt(emprestimoId));
            let mensagem = `Devolução realizada com sucesso!`;

            if (emprestimo.multa > 0) {
                mensagem += ` Multa: R$ ${emprestimo.multa.toFixed(2)}`;
            }

            mostrarMensagem(mensagem, 'success');
            listarEmprestimos();
            atualizarDashboard();
        } catch (error) {
            mostrarMensagem(error.message, 'error');
        }
    }
}

function listarEmprestimos() {
    const tabela = document.getElementById('tabelaEmprestimos');
    const corpo = document.getElementById('corpoTabelaEmprestimos');

    corpo.innerHTML = '';

    biblioteca.emprestimos.forEach(emprestimo => {
        emprestimo.calcularMulta();

        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>${emprestimo.id}</td>
                    <td>${emprestimo.usuario.nome}</td>
                    <td>${emprestimo.livro.titulo}</td>
                    <td>${emprestimo.dataEmprestimo.toLocaleDateString('pt-BR')}</td>
                    <td>${emprestimo.dataPrevistaDevolucao.toLocaleDateString('pt-BR')}</td>
                    <td><span class="status ${emprestimo.status.toLowerCase()}">${emprestimo.status}</span></td>
                    <td>
                        ${emprestimo.status !== 'Devolvido' ?
                `<button class="btn btn-warning" onclick="devolverLivro(${emprestimo.id})">Devolver</button>` :
                'Devolvido'
            }
                    </td>
                `;
        corpo.appendChild(row);
    });

    tabela.style.display = 'table';
}

function devolverLivro(emprestimoId) {
    try {
        const emprestimo = biblioteca.realizarDevolucao(emprestimoId);
        let mensagem = `Devolução realizada com sucesso!`;

        if (emprestimo.multa > 0) {
            mensagem += ` Multa: R$ ${emprestimo.multa.toFixed(2)}`;
        }

        mostrarMensagem(mensagem, 'success');
        listarEmprestimos();
        carregarSelectsEmprestimo();
        atualizarDashboard();
    } catch (error) {
        mostrarMensagem(error.message, 'error');
    }
}

function gerarRelatorioLivros() {
    const container = document.getElementById('relatorioContainer');

    let html = `
                <h3>📊 Relatório de Livros</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Título</th>
                            <th>Autor</th>
                            <th>Categoria</th>
                            <th>Total Cópias</th>
                            <th>Disponíveis</th>
                            <th>Emprestadas</th>
                            <th>Taxa de Ocupação</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

    biblioteca.livros.forEach(livro => {
        const emprestadas = livro.numeroCopias - livro.copiasDisponiveis;
        const taxaOcupacao = ((emprestadas / livro.numeroCopias) * 100).toFixed(1);

        html += `
                    <tr>
                        <td>${livro.id}</td>
                        <td>${livro.titulo}</td>
                        <td>${livro.autor}</td>
                        <td>${livro.categoria}</td>
                        <td>${livro.numeroCopias}</td>
                        <td>${livro.copiasDisponiveis}</td>
                        <td>${emprestadas}</td>
                        <td>${taxaOcupacao}%</td>
                    </tr>
                `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function gerarRelatorioUsuarios() {
    const container = document.getElementById('relatorioContainer');

    let html = `
                <h3>👥 Relatório de Usuários</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Tipo</th>
                            <th>Empréstimos Ativos</th>
                            <th>Total Histórico</th>
                            <th>Data Cadastro</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

    biblioteca.usuarios.forEach(usuario => {
        html += `
                    <tr>
                        <td>${usuario.id}</td>
                        <td>${usuario.nome}</td>
                        <td>${usuario.tipo}</td>
                        <td>${usuario.emprestimosAtivos.length}</td>
                        <td>${usuario.historicoEmprestimos.length}</td>
                        <td>${usuario.dataCadastro.toLocaleDateString('pt-BR')}</td>
                    </tr>
                `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function gerarRelatorioEmprestimos() {
    const container = document.getElementById('relatorioContainer');

    const emprestimosAtivos = biblioteca.emprestimos.filter(e => e.status === 'Ativo').length;
    const emprestimosDevolvidos = biblioteca.emprestimos.filter(e => e.status === 'Devolvido').length;
    const emprestimosAtrasados = biblioteca.emprestimos.filter(e => e.status === 'Atrasado').length;

    let html = `
                <h3>📈 Relatório de Empréstimos</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>${emprestimosAtivos}</h3>
                        <p>Empréstimos Ativos</p>
                    </div>
                    <div class="stat-card">
                        <h3>${emprestimosDevolvidos}</h3>
                        <p>Empréstimos Devolvidos</p>
                    </div>
                    <div class="stat-card">
                        <h3>${emprestimosAtrasados}</h3>
                        <p>Empréstimos Atrasados</p>
                    </div>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuário</th>
                            <th>Livro</th>
                            <th>Data Empréstimo</th>
                            <th>Prazo Devolução</th>
                            <th>Status</th>
                            <th>Multa</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

    biblioteca.emprestimos.forEach(emprestimo => {
        emprestimo.calcularMulta();

        html += `
                    <tr>
                        <td>${emprestimo.id}</td>
                        <td>${emprestimo.usuario.nome}</td>
                        <td>${emprestimo.livro.titulo}</td>
                        <td>${emprestimo.dataEmprestimo.toLocaleDateString('pt-BR')}</td>
                        <td>${emprestimo.dataPrevistaDevolucao.toLocaleDateString('pt-BR')}</td>
                        <td><span class="status ${emprestimo.status.toLowerCase()}">${emprestimo.status}</span></td>
                        <td>R$ ${emprestimo.multa.toFixed(2)}</td>
                    </tr>
                `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function gerarRelatorioAtrasados() {
    const container = document.getElementById('relatorioContainer');

    const livrosAtrasados = biblioteca.getLivrosAtrasados();

    let html = `
                <h3>⚠️ Relatório de Livros em Atraso</h3>
                <div class="alert ${livrosAtrasados.length > 0 ? 'alert-error' : 'alert-success'}">
                    ${livrosAtrasados.length > 0 ?
            `Existem ${livrosAtrasados.length} livros em atraso!` :
            'Não há livros em atraso no momento!'
        }
                </div>
            `;

    if (livrosAtrasados.length > 0) {
        html += `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID Empréstimo</th>
                                <th>Usuário</th>
                                <th>Livro</th>
                                <th>Data Empréstimo</th>
                                <th>Prazo Vencido</th>
                                <th>Dias de Atraso</th>
                                <th>Multa Acumulada</th>
                                <th>Contato</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

        livrosAtrasados.forEach(emprestimo => {
            emprestimo.calcularMulta();
            const diasAtraso = Math.floor((new Date() - emprestimo.dataPrevistaDevolucao) / (1000 * 60 * 60 * 24));

            html += `
                        <tr>
                            <td>${emprestimo.id}</td>
                            <td>${emprestimo.usuario.nome}</td>
                            <td>${emprestimo.livro.titulo}</td>
                            <td>${emprestimo.dataEmprestimo.toLocaleDateString('pt-BR')}</td>
                            <td>${emprestimo.dataPrevistaDevolucao.toLocaleDateString('pt-BR')}</td>
                            <td>${diasAtraso} dias</td>
                            <td>R$ ${emprestimo.multa.toFixed(2)}</td>
                            <td>${emprestimo.usuario.telefone}</td>
                        </tr>
                    `;
        });

        html += '</tbody></table>';
    }

    container.innerHTML = html;
}

function mostrarMensagem(mensagem, tipo) {
    const mensagensAnteriores = document.querySelectorAll('.mensagem-temporaria');
    mensagensAnteriores.forEach(msg => msg.remove());

    const div = document.createElement('div');
    div.className = `alert alert-${tipo === 'success' ? 'success' : 'error'} mensagem-temporaria`;
    div.textContent = mensagem;
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.right = '20px';
    div.style.zIndex = '1000';
    div.style.minWidth = '300px';

    document.body.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 4000);
}

document.addEventListener('DOMContentLoaded', function () {
    atualizarDashboard();
});