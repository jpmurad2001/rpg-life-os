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
  <img src="https://img.shields.io/badge/version-Platina_v3.2.1-b9f2ff?style=for-the-badge" alt="Version"/>
</p>

---

## 🌑 Sinopse

O **RPG Life OS** é um sistema operacional de vida pessoal gamificado, construído como PWA, onde cada tarefa concluída é um **Encontro vencido**, cada hábito mantido aumenta seus **Atributos**, e cada meta cumprida aproxima você de derrotar o **Boss da sua Campanha**.

Inspirado no sistema de progressão do universo *Shadow Slave* — com Ranks de *Adormecido* a *Profano* —, o app transforma sua rotina em uma jornada de RPG persistent persistente, com feedback visual de jogo real.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| ⚔️ **Quests** | Crie tarefas diárias e subtarefas com atributos (INT / ART / AVE / FOR / CAR). Ganhe progressão de Rank e HP. |
| 🏋️ **Treino** | Registre sessões de exercício com templates. Ganhe HP e progressão por série completada. |
| 🏰 **Taverna** | Controle receitas, despesas e orçamento mensal inspirado no gerenciamento de recursos. |
| 🗺️ **Modo Campanha** | Mapa visual interativo com nós SVG dinâmicos. Encontre e derrote Bosses. |
| 💎 **Memórias (Loot)** | Inventário de itens (Armas, Ecos, Armaduras) com raridades (Adormecido -> Divino). |
| 📈 **Tear do Destino** | **Analytics Gamificado**: Visualize sua produtividade em constelações e gráficos radar de atributos. |
| 🧘 **Reino dos Sonhos** | **Pomodoro Hardcore**: Timer imersivo focado em manter o flow e evitar a corrupção mental. |
| 🌳 **Árvore de Talentos** | Desbloqueie **Habilidades de Aspecto** permanentes usando sua Memória Essencial. |
| 📜 **Títulos Dinâmicos** | Receba títulos heróicos (Lâmina Sábia, Ceifador) baseados nos seus atributos e feitos. |
| 📋 **Board de Planos** | Sistema Kanban para organizar projetos de longo prazo e metas estratégicas. |
| 🎵 **BGM Engine** | Playlist nativa de músicas imersivas para foco e combate, com controles completos de player. |
| 🏆 **Conquistas** | Ganhe **Badges em Pixel Art** de alta resolução ao atingir marcos históricos no jogo. |

---

## 🎮 Sistema de Ranks (Nightmare Core)

Os Ranks de **Boss** seguem a hierarquia dos Pesadelos do universo Shadow Slave:

> 😴 Adormecido → 👁️ Desperto → 💀 Caído → 🖤 Corrompido → ⚡ Grande → 🩸 Amaldiçoado → 🌑 Profano

Os Ranks de **Jogador** evoluem conforme os Fragmentos de Sombra acumulados:

> Adormecido → Desperto → Ascendido → Santo → Soberano

---

## 🗺️ Assets (v1.0)

### Mapas de Fundo (16:9 · WebP)
| Asset | Bioma |
|-------|-------|
| Costa Esquecida | Costa / Ruínas |
| Bastião do Lago | Água / Fortaleza |
| Costa Azure | Praia de Cristais |
| Ermos Carmesins | Abismo Derretido |
| Espira Congelada | Gelo / Pico |
| Expansão s/ Estrelas | Berços Ocos |
| Metrópole Esquecida | Selva de Concreto |
| Planícies Verdejantes | Antiguidade |
| Profundezas Cintilantes | Clareira Sussurrante |
| Sepulcro Dourado | Deserto dos Ecos |
| Sepulcro Visceral | Deus Caído |

### Sprites de Boss (Pixel Art 16-bit · WebP)
Titã de Obsidiana, Boca do Pesadelo, Eco (Aethel), Sentinela (Jotun), Tirano (Pyroclast), Fauce Abissal, Geleia Voraz, Pássaro Ladrão, Rei das Vinhas, Semente da Escuridão, Soberano Esqueleto, Espadachim Desolado.

---

## 🛠️ Stack Técnica

```text
Front-end:  Vanilla JS (ES Modules) · HTML5 Semântico · CSS3 Vanilla (Design System)
Back-end:   Firebase Firestore (NoSQL Cloud DB) · Firebase Hosting (CDN)
PWA:        Service Worker (Cache v26) · Web App Manifest · Offline Support
Assets:     WebP otimizado · Pixel Art 16-bit · Sprites com fundo transparente
```

---

## 📂 Estrutura do Projeto

```text
rpg_life_os/
├── index.html                    # SPA Entry point
├── sw.js                         # Service Worker — cache v26
├── manifest.json                 # PWA Manifest
├── firebase.json                 # Firebase Hosting config
├── README.md
├── assets/
│   ├── maps/                     # 11 mapas 16:9 (.webp)
│   ├── bosses/                   # 12 sprites de boss (.webp)
│   ├── sprites_memorias/         # Sprites de loot (Memórias)
│   └── sfx/musics/               # BGM tracks locais (.mp3)
└── src/
    ├── config/
    │   └── assets_gallery.js     # ← Registre novos mapas/bosses aqui
    ├── engine/
    │   ├── core.js               # Estado global, XP, HP, Ranks
    │   ├── gamification.js       # Modais, Toasts, Loot drops
    │   ├── audio.js              # API do reprodutor de áudio
    │   └── music_player.js       # Engine de BGM (playlist local)
    ├── firebase/
    │   ├── auth.js               # Firebase Auth
    │   └── db.js                 # CRUD Firestore (quests, bosses, nodes…)
    ├── modules/
    │   ├── quests.js             # View de Quests
    │   ├── battle.js             # View de Treino
    │   ├── taverna.js            # View de Finanças
    │   ├── campaign_map.js       # View de Campanha (boss maps, nodes, SVG)
    │   ├── inventory.js          # View de Memórias (loot grid)
    │   └── bosses.js             # Legado de compatibilidade
    └── ui/
        ├── app.js                # Orquestrador de UI e navegação
        ├── style.css             # Core Design System + variáveis
        ├── style-campaign.css    # Modo Campanha + mini-mapa
        ├── style-phase3.css      # Light/Dark Theme overrides
        └── style-player.css      # BGM Player UI
```

---

## 🚀 Como Adicionar Novos Assets

### Novos Mapas
1. Coloque o arquivo `.webp` em `/assets/maps/`
2. Registre-o em `src/config/assets_gallery.js`:
   ```js
   { id: 'meu_mapa', path: '/assets/maps/meu_mapa.webp', name: 'Meu Mapa' },
   ```
3. Atualize a versão de cache em `sw.js` e rode `firebase deploy --only hosting`.

### Novos Bosses
Mesmo processo com `/assets/bosses/` e `BOSS_GALLERY` no mesmo arquivo.

---

## 🚀 Como Rodar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/rpg-life-os.git

# 2. Sirva localmente (necessário para Service Worker)
python -m http.server 8765

# 3. Acesse http://localhost:8765
```

> **Importante:** Configure suas próprias credenciais Firebase em `src/firebase/db.js` e `src/firebase/auth.js` se quiser usar seu próprio banco de dados.

---

## ☁️ Deploy (Firebase Hosting)

```bash
# 1. Incremente a versão de cache em sw.js (ex: v26 → v27)
# 2. Deploy
firebase deploy --only hosting
```

🔗 Live: **https://shadow-slave-life-os.web.app**

---

## 🛤️ Roadmap
---

### 💎 Pacote Diamond (v2.0 - v2.7) - Mecânicas de Punição e Foco [CONCLUÍDO]
A era Diamond focou em trazer peso para as suas decisões e recompensar a disciplina absoluta.

- [x] **v2.2 - O Reino dos Sonhos (Pomodoro Hardcore)**: Timer implacável para manter o flow.
- [x] **v2.3 - Habilidades de Aspecto (Árvore de Talentos)**: Desbloqueio de passivas.
- [x] **v2.4 - Tear do Destino (Analytics Gamificado)**: Gráficos e constelações de produtividade.
- [x] **v2.5 - Marcos do Despertar (Sistema de Conquistas)**: +20 Badges únicas em Pixel Art de alta resolução.
- [x] **v2.6 - Títulos Dinâmicos (Title Manager)**: Sistema centralizado que concede títulos como *Lâmina Sábia* ou *Senhor das Sombras* com base em atributos e feitos.
- [x] **v2.7 - Expansão da Campanha**: Suporte total a 5 atributos nos encontros (INT, ART, AVE, FOR, CAR).

---

### 🏆 Pacote Platina (v3.0 - v3.3) - Ecossistema, Criação e Transformação

> [!IMPORTANT]
> A fase Platina expande o Life OS de um rastreador de tarefas para um ecossistema vivo de progresso e customização.

#### v3.0 - O Despertar da Identidade (Cosméticos e Avatares)
- **Perfil do Usuário**: Seleção de avatares e customização visual.
- **Temas Globais**: Interface adaptável (ex: *Blood Mode*, *Void Mode*, *Abyssal Dark*).
- **Adornos de Perfil**: Molduras e títulos visuais baseados nas conquistas da era Diamond.

#### v3.1 - A Forja de Memórias & O Mercado (Economia e Crafting) [DESATIVADO]
- **Economia de Sombras**: Sistema de moedas ocultado para priorizar estabilidade e foco.
- **O Mercado**: Interface removida para simplificação do core.
- **A Forja**: Crafting desativado; foco em loot direto por Bosses.

#### v3.2 - Estabilização de Core (v3.2.1) [ATUAL]
- **Remoção de Instabilidade**: Limpeza de UI e remoção de módulos que impediam o login.
- **HUD Focado**: Remoção de indicadores de moedas da barra superior para maior imersão.
- **Sincronização Cloud**: Melhorias no sync do Firestore para multi-dispositivos.
- **Legião de Sombras**: Desbloqueie e equipe **Ecos** que aparecem no painel principal.
- **Ressonância Passiva**: Ecos concedem buffs (Ex: Eco Bestial: +5% ganho FOR; Eco Espectro: margem de erro no Pomodoro).

#### v3.3 - Templos da Dualidade (Deuses e Daemons)
- **Endgame Hardcore**: Progressão lenta e punitiva focada em mudanças definitivas.
- **Templos dos Daemons**: Focados em destruir maus hábitos e vícios. Falhar aqui zera o progresso do Templo.
- **Templos dos Deuses**: Focados em forjar virtudes (disciplina, esforço profundo). Exige constância extrema.
- **Recompensa Final**: Status de perfil único e os itens mais raros do jogo.

---

🔗 Live: **https://shadow-slave-life-os.web.app**
