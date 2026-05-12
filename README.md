# Shadow Slave Life OS 🌑

> **v5.2 — Forja & Planejamento** | Sistema de produtividade gamificado baseado em Shadow Slave

[![Deploy](https://img.shields.io/badge/deploy-firebase-orange)](https://shadow-slave-life-os.web.app)

## 🚀 Funcionalidades

### 🗡️ Kanban — Quadro de Missões
- **Drag & Drop** nativo com reordenação intra/inter-coluna 100% independente
- **Replicação Seletiva**: replique qualquer card para colunas específicas — cada réplica é completamente independente (posição, subtarefas, checklist). Marcador 🔁 indica réplicas
- **Modo Planning (Time Slots)**: adicione horários (HH:MM → HH:MM + label) diretamente no card via seção "⏰ Cronograma" — visível como badge na face do card
- Cards com **prioridade RPG** (Normal, Épico, Lendário), recorrência (diária/semanal), descrição rich (links + embeds de imagem), checklist de subtarefas e duplicação
- Reset diário automático de subtarefas e time slots em cards recorrentes

### ⚔️ Treinos (Battle Ground)
- Templates de treino com exercícios, séries, reps e timer de descanso
- **Template nunca é apagado ao finalizar** — apenas a sessão é registrada. O template fica disponível para repetição imediata
- Histórico de sessões + gráfico de frequência

### 📜 Quests & Tarefas
- Sistema de quests semanais por atributo (INT, ART, AVE, FOR, CAR)
- Calendário nativo para navegação rápida entre semanas
- XP e HP dinâmicos por conclusão

### 👤 Perfil & Sidebar
- **Toggle Badge/Foto**: clique no medalhão da sidebar para alternar entre a badge ativa e sua foto de perfil com transição suave
- Sistema de badges RPG desbloqueáveis por conquistas
- Radar de atributos com gráfico canvas

### ☁️ Cloud-First (Firebase)
- **Sincronização cross-device real**: dados por `uid` no Firestore
- Login em qualquer navegador/dispositivo carrega tudo automaticamente
- Loot table de Memórias persistida no Firestore

## 🛠️ Stack
- Vanilla JS (ES Modules), HTML5, CSS3
- Firebase v10 (Auth + Firestore + Hosting)

## 🌐 Deploy
```bash
firebase deploy --only hosting
```

Live: [https://shadow-slave-life-os.web.app](https://shadow-slave-life-os.web.app)
