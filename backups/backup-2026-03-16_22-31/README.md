# 🎮 RPG Life OS

> **Gerencie sua vida como um herói de RPG 16-bits.**
> PWA offline-first · localStorage · Sem backend · Pixel Art

---

## 🗂️ Estrutura de Pastas

```
rpg_life_os/
├── index.html              # Shell HTML principal (responsive)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (offline cache)
│
├── src/
│   ├── engine/
│   │   ├── core.js         # Core Engine: estado, XP, HP, fórmulas
│   │   └── gamification.js # Renderização HUD, toasts, modais, navegação
│   │
│   ├── modules/
│   │   ├── quests.js       # Módulo: Planejamento Semanal
│   │   ├── battle.js       # Módulo: Battle Ground (Treino)
│   │   ├── taverna.js      # Módulo: Taverna (Finanças)
│   │   └── bosses.js       # Módulo: Bosses (Projetos Épicos)
│   │
│   ├── ui/
│   │   ├── app.js          # Entrypoint: boot, navegação, achievements
│   │   └── style.css       # CSS completo com tema 16-bits
│   │
│   └── schema.json         # Esquema de referência do localStorage
│
└── assets/
    ├── fonts/              # Fontes pixel-art locais (opcional)
    ├── sprites/            # Ícones e sprites (icon-192.png, icon-512.png)
    └── sfx/                # Son effects (opcional)
```

---

## 🚀 Como Rodar

### Opção 1: Servidor local simples (recomendado)
```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```
Acesse: `http://localhost:8080`

### Opção 2: VS Code Live Server
Instale a extensão **Live Server** e clique em "Open with Live Server" no `index.html`.

> **⚠️ Não abra o `index.html` diretamente como `file://`.**  
> ES Modules e Service Workers requerem um servidor HTTP.

---

## 🧠 Regras de Negócio

### Nivelamento
```
XP_next = 100 × level^1.5
```
| Level | XP Necessário |
|-------|--------------|
| 1 → 2 | 100 XP |
| 2 → 3 | 283 XP |
| 5 → 6 | 559 XP |
| 10 → 11 | 1.000 XP |

### Atributos
| Atributo | Descrição | Cor |
|----------|-----------|-----|
| 🧠 INT | Tarefas analíticas/estudo | Roxo |
| 🎨 ART | Tarefas criativas | Rosa |
| 🗡️ AVE | Treinos físicos | Verde |

### HP
- Treinos concluídos → +HP
- (Futuro) Dias sem atividade → -HP

### Bosses
- Cada Boss tem HP massivo
- Subtarefas = "Ataques" que reduzem o HP do Boss
- Ao derrotar: bônus de XP + conquista

### Finanças (Taverna)
```
Saldo Livre = Receitas - (Despesas Pagas + Despesas Previstas)
```
Sem ligação com XP. Tracking puro.

---

## 💾 LocalStorage

Chave: `rpg_life_os_v1`  
Schema completo: [`src/schema.json`](src/schema.json)

### Módulos do Schema
| Chave | Descrição |
|-------|-----------|
| `player` | Dados do jogador (XP, HP, atributos, badges) |
| `quests.weeks` | Tarefas semanais por `YYYY-WXX` |
| `battle_ground` | Templates e sessões de treino |
| `taverna.months` | Finanças por `YYYY-MM` |
| `bosses` | Projetos épicos com subtarefas |
| `achievements` | Sistema de conquistas |

---

## 🗺️ Roadmap

- [x] Schema JSON + Core Engine
- [x] HTML skeleton responsivo
- [x] CSS 16-bit theme system
- [x] Módulo Quests (CRUD + XP)
- [x] Módulo Battle Ground
- [x] Módulo Taverna
- [x] Módulo Bosses
- [x] PWA (manifest + SW)
- [ ] Ícones pixel-art reais
- [ ] Sons de 8-bit na UI
- [ ] Gráficos de progresso
- [ ] Export/Import de dados
- [ ] Modo claro (light theme)
