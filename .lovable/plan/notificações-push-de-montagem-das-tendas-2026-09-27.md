# Notificações push de montagem das tendas

## O que o gestor vai ver
- Em **Configurações**, um botão "Ativar notificações neste aparelho" (celular ou computador). Pode ativar em vários aparelhos. O painel precisa estar aberto numa aba própria ou no site publicado, não dentro do editor.
- Ao clicar em **Confirmar aluguel**, a locação recebe dois lembretes automáticos:
  - **1 dia antes**, às 08:00 (horário de Brasília)
  - **No dia do aluguel**, às 06:00
- Em cada locação confirmada: campos para mudar a data e hora de cada lembrete.
- No dia do aluguel, depois do primeiro aviso, a notificação se repete **a cada 2 horas** até o gestor clicar em **"Tenda montada"**.
- Um selo na locação mostra "Aguardando montagem" ou "Montada".

## Pré-requisito
As notificações usam o Firebase (serviço gratuito do Google). Você vai precisar criar um projeto no Firebase e conectá-lo quando o cartão de conexão aparecer. Eu explico o passo a passo.

## Também incluído
Correção pendente do erro "Não foi possível validar a senha" no site publicado.

## Detalhes técnicos
- Migração: em `rentals`, adicionar `lembrete_vespera_em`, `lembrete_dia_em` (timestamptz), `montada` (bool), `ultimo_aviso_em`, `vespera_enviado` (bool). Nova tabela `push_tokens` (token único, criado_em), acessada só pelo servidor.
- Ao confirmar: preencher os horários padrão (America/Sao_Paulo).
- Conector Firebase Cloud Messaging com web push; `public/firebase-messaging-sw.js`; server fn para salvar o token (validando a sessão do gestor).
- Rota `/api/public/lembretes` protegida por segredo, chamada pelo pg_cron **a cada 30 minutos** (48 vezes/dia) para respeitar o intervalo de 2h com atraso máximo de ~30 min. Envia a véspera uma vez; no dia, envia se `agora >= lembrete_dia_em`, não montada e `ultimo_aviso_em` há 2h ou mais. Tokens inválidos são removidos.
- Mover os auxiliares de senha para `admin-auth.server.ts`.
