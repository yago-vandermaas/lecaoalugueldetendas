# Tent HQ

Papel e Objetivo: Crie uma aplicação web moderna, responsiva e visualmente impressionante para uma empresa de aluguel de tendas. O site deve funcionar como uma página de vendas (Landing Page) de alta conversão para anúncios de redes sociais, catálogo interativo de tendas com fluxo de checkout via WhatsApp e um painel de gestão simples para o dono controlar estoque e faturamento.

🎨 Design e UI/UX

Estilo Visual: Profissional, limpo, moderno e chamativo (otimizado para converter o tráfego vindo de anúncios no Instagram/Facebook).

Paleta de Cores: Tons elegantes e profissionais (Azul Marinho, Cinza Grafite, detalhes em Verde para ações do WhatsApp e fundo Claro/Off-white).

Layout: Design focado em dispositivos móveis (mobile-first), navegação fluida, cards modernos com efeitos suaves ao passar o mouse e tipografia bem legível.

📱 Funcionalidades Principais

1. Página Inicial e Catálogo Público (Visão do Cliente)

Seção Hero (Topo): Título chamativo, frase de impacto, botão principal de ação ("Ver Tendas Disponíveis") e um botão flutuante do WhatsApp visível em todas as páginas.

Catálogo Interativo:

Exibição em grade (grid) das tendas com imagens atraentes.

Informações do card: Nome do Modelo, Dimensões/Tamanho, Selo de Disponibilidade ("Disponível" vs "Reservado"), Preço da Diária e Foto.

Barra de busca/filtro por tamanho ou tipo de tenda.

Carrinho e Fluxo de Reserva:

O cliente pode selecionar as datas da reserva (Início e Fim) para calcular os dias e o valor total.

Ao adicionar ao carrinho, o item fica marcado temporariamente como Reservado.

Checkout via WhatsApp: Ao clicar em "Finalizar Pedido", o sistema formata uma mensagem automática e bem organizada (Itens escolhidos, Datas, Valor Total, Nome do Cliente e Local do Evento) e abre diretamente o WhatsApp do dono da empresa com o texto pronto.

2. Painel Administrativo / Gestão (Visão do Dono)

Acesso do Gestor: Tela simples de login ou alternância de perfil de administrador.

Gestão de Estoque e Produtos:

Interface para cadastrar, editar ou remover modelos de tendas (Link/Upload da imagem, Nome, Dimensões, Valor da Diária e Quantidade em Estoque).

Opção manual para alterar o status da tenda (Disponível, Reservada, Em Manutenção).

Sistema de Faturamento e Métricas:

Indicadores visuais: Total de Tendas Alugadas, Faturamento Estimado/Realizado (calculado com base nas tendas locadas e dias de aluguel) e Taxa de Ocupação do Estoque (%).

Registro simples de locações para marcar pedidos como pagos/concluídos.

🛠️ Requisitos Técnicos

Botão flutuante do WhatsApp fixo no canto inferior direito.

Validação dos campos do formulário antes de enviar o pedido (Nome, Telefone, Endereço e Datas).

Incluir dados de exemplo (mock data) com 3 a 4 modelos de tendas reais para visualização inicial do projeto.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lecaoalugueldetendas.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b725e7dc-ce1d-4d0a-8982-1e6cd8f2c27d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
