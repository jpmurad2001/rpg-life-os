<p align="center">
  <img src="assets/logo/logo.png" alt="RPG Life OS Logo" width="250"/>
</p>

<h1 align="center">⚔️ Shadow Slave — RPG Life OS</h1>

<p align="center">
  <strong>Transforme sua vida real em uma Campanha de RPG Dark Fantasy.</strong><br/>
  Um PWA de produtividade gamificada inspirado no universo de Shadow Slave.
</p>

<p align="center">
  <a href="https://shadow-slave-life-os.web.app" target="_blank">
    <img src="https://img.shields.io/badge/🎮_Live_Demo-shadow--slave--life--os.web.app-6d28d9?style=for-the-badge" alt="Live Demo"/>
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/PWA-Ready-green?style=for-the-badge&logo=googlechrome" alt="PWA"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase" alt="Firebase"/>
  &nbsp;
  <img src="https://img.shields.io/badge/version-Cinematic_v4.3.0-6d28d9?style=for-the-badge" alt="Version"/>
</p>

---

## 🌑 Sinopse

O **RPG Life OS** é um sistema operacional de vida pessoal gamificado, construído como PWA, onde cada tarefa concluída é um **Encontro vencido**, cada hábito mantido aumenta seus **Atributos**, e cada meta cumprida aproxima você de derrotar o **Boss da sua Campanha**.

Inspirado no sistema de progressão do universo *Shadow Slave* — com Ranks de *Adormecido* a *Profano* —, o app transforma sua rotina em uma jornada de RPG persistente, com feedback visual de jogo real.

---

## ✨ Funcionalidades (Série Platina)

| Módulo | Descrição |
|--------|-----------|
| ⚔️ **Quests** | Crie tarefas diárias e subtarefas com atributos (INT / ART / AVE / FOR / CAR). Ganhe progressão de Rank e HP. |
| 🏋️ **Treino** | Registre sessões de exercício com templates. Ganhe HP e progressão por série completada. |
| 🏰 **Taverna** | Controle receitas, despesas e orçamento mensal inspirado no gerenciamento de recursos. |
| 🗺️ **Modo Campanha** | Mapa visual interativo com nós SVG dinâmicos. Encontre e derrote Bosses das categorias Nightmare. |
| 🏰 **Hub World Cinemático** | Navegação imersiva point-and-click por Zonas (Cidadela, Guilda, Mar da Alma) com backgrounds em vídeo (loop 4k) e transições crossfade. |
| 👹 **Ecos e Memórias** | **Sistema de Loot v2**: Colete Ecos (companions) e Memórias (itens) ao derrotar bosses. Equipe-os em slots específicos de Atributo. |
| 🏛️ **Templos da Dualidade** | **Endgame Hardcore**: Escolha entre Deuses (Virtudes) e Daemons (Pecados) para desafios extremos de disciplina e foco. |
| 🎨 **Design System 2.0** | Centralizador de Temas com 9 variações visuais (Divino, Corrompido, Esmeralda, Night Sky, etc). |
| 📈 **Tear do Destino** | **Analytics Gamificado**: Visualize sua produtividade em constelações e gráficos radar de atributos. |
| 🧘 **Reino dos Sonhos** | **Pomodoro Hardcore**: Timer imersivo focado em manter o flow e evitar a corrupção mental. |
| 🌳 **Árvore de Talentos** | Desbloqueie **Habilidades de Aspecto** permanentes usando sua Memória Essencial. |
| 📋 **Board de Planos** | Sistema Kanban para organizar projetos de longo prazo e metas estratégicas. |
| 🎵 **BGM Engine** | Playlist nativa de músicas imersivas para foco e combate, com controles completos de player. |

---

## 🎨 Temas e Estética

O Life OS Platina conta com um sistema de temas dinâmicos que alteram completamente a atmosfera do app:
- **Abyssal Dark & Void Mode**: Foco em roxo profundo e obsidiana.
- **Blood Mode**: Visual agressivo em carmesim.
- **Tema Divino**: Aura dourada e branca para foco puro.
- **Tema Esmeralda**: Tons de natureza e calma mística.
- **Night Sky**: Minimalismo absoluto com estrelas tênues.

---

## 🛠️ Stack Técnica

```text
Front-end:  Vanilla JS (ES Modules) · HTML5 Semântico · CSS3 Vanilla (Design System)
Back-end:   Firebase Firestore (NoSQL Cloud DB) · Firebase Hosting (CDN)
PWA:        Service Worker (Cache v30) · Web App Manifest · Offline Support
Assets:     WebP otimizado · Pixel Art 16-bit · Imagens 4k via AI Generation
```

---

## 📂 Estrutura do Projeto

```text
rpg_life_os/
├── index.html                    # SPA Entry point
├── src/
│   ├── config/
│   │   ├── echoes.js             # Configuração da base de Ecos
│   │   ├── templesData.js        # Dados da Lore dos 14 Templos
│   │   └── titles.js             # Títulos desbloqueáveis
│   ├── engine/
│   │   ├── core.js               # Motor de XP, Ranks e Estado
│   │   └── audio.js              # Gerenciador de SFX e BGM
│   ├── modules/
│   │   ├── inventory.js          # Sistema de Ecos e Equipamentos
│   │   ├── temples.js            # Lógica dos Templos da Dualidade
│   │   └── quests.js             # View de Missões
│   └── ui/
│       ├── app.js                # Core UI Logic & Navigation
│       ├── style-themes.css      # Design System de Temas Globais
│       └── style-temples.css     # Estética dos Templos (Glassmorphism)
└── assets/
    ├── ecos/                     # Sprites dos Ecos despertos
    ├── temple/                   # Ícones e sprites das Divindades
    └── bg/                       # Backgrounds 4k dos temas
```

---

## 🚀 Como Rodar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/jpmurad2001/rpg-life-os.git

# 2. Requisitos: Servidor local (necessário p/ Service Worker e Modules)
npx serve . 
# ou
python -m http.server 8000
```

---

## 🛤️ Roadmap Concluído (Série Platina)

- [x] **v3.1 - O Despertar da Identidade**: Sistema de perfis, avatares e molduras.
- [x] **v3.2 - Legião de Sombras**: Implementação do sistema de Ecos e multiplicadores por slots (STR, INT, AVE, ART, CAR).
- [x] **v3.3 - Templos da Dualidade**: Inclusão de 14 entidades (Deuses e Daemons) com sistema de Altar e Panteão.
- [x] **v3.4 - Múltiplos Horizontes**: Centralização de 9 temas de design premium e limpeza de UI core.
- [x] **v4.2 - Mapeamento Dinâmico**: Editor de Pins (`hub_pins.js`) com sistema drag-and-drop para mapeamento dos hubs.
- [x] **v4.3 - Cinematic Hub World**: Navegação imersiva via Hubs de vídeo, Loading Screen imersiva, crossfade engines, correção de Normalização de Loot (apenas Memórias com Sprite).

---

🔗 Live: **https://shadow-slave-life-os.web.app**
