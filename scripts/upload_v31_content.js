const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'shadow-slave-life-os';

// Tenta obter o token do ambiente, do argumento ou gera via Firebase CLI
let accessToken = process.env.FB_TOKEN || process.argv[2];

if (!accessToken) {
  try {
    console.log('🔑 Tentando gerar token via Firebase CLI...');
    accessToken = execSync('firebase auth:print-access-token').toString().trim();
  } catch (e) {
    console.error('❌ Erro: Token não fornecido e falha ao gerar via CLI.');
    console.log('Uso: node upload_v31_content.js [SEU_TOKEN] ou FB_TOKEN=[TOKEN] node upload_v31_content.js');
    process.exit(1);
  }
}

const MEMORIES_FILE = path.join(__dirname, '..', 'tmp', 'memorias_batch.json');

const NEW_BOSSES = [
  {
    id: 'abominacao_aguas',
    data: {
      name: "Abominação das Águas Negras",
      is_active: true,
      rank: "Mestre",
      hp_max: 4500,
      xp_reward: 600,
      image_url: "/assets/bosses/abominacao_das_aguas_negras.webp",
      description: "Uma criatura amorfa surgida das profundezas contaminadas do Mar Morto.",
      eligible_for: ["boss"]
    }
  },
  {
    id: 'arauto_frio',
    data: {
      name: "Arauto do Frio Eterno",
      is_active: true,
      rank: "Santo",
      hp_max: 8500,
      xp_reward: 1200,
      image_url: "/assets/bosses/arauto_do_frio_eterno.webp",
      description: "Um espectro gélido que vaga pelas montanhas da Espira Congelada.",
      eligible_for: ["boss"]
    }
  },
  {
    id: 'dragao_onix',
    data: {
      name: "Dragão de Ônix Púrpura",
      is_active: true,
      rank: "Santo",
      hp_max: 12000,
      xp_reward: 2000,
      image_url: "/assets/bosses/dragao_de_onix_purpura.webp",
      description: "O guardião milenar das cavernas de cristal, cujas escamas são pura pedra preciosa.",
      eligible_for: ["boss"]
    }
  },
  {
    id: 'espreitador_vazio',
    data: {
      name: "Espreitador do Vazio",
      is_active: true,
      rank: "Mestre",
      hp_max: 5500,
      xp_reward: 800,
      image_url: "/assets/bosses/espreitador_do_vazio.webp",
      description: "Uma sombra que se move entre as dimensões, atacando antes de ser vista.",
      eligible_for: ["boss"]
    }
  },
  {
    id: 'sacerdote_profanado',
    data: {
      name: "Sacerdote Profanado",
      is_active: true,
      rank: "Santo",
      hp_max: 9000,
      xp_reward: 1500,
      image_url: "/assets/bosses/sacerdote_profanado.webp",
      description: "Um antigo servo dos Deuses que sucumbiu à corrupção do Terceiro Pesadelo.",
      eligible_for: ["boss"]
    }
  }
];

function convertToFirestoreFormat(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') fields[key] = { stringValue: value };
    else if (typeof value === 'number') {
      if (Number.isInteger(value)) fields[key] = { integerValue: value.toString() };
      else fields[key] = { doubleValue: value };
    } else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
    else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item => ({ stringValue: String(item) }))
        }
      };
    }
  }
  return { fields };
}

async function uploadDoc(collection, docId, data) {
  const firestoreData = convertToFirestoreFormat(data);
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(firestoreData)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Erro ao subir ${docId}: ${JSON.stringify(err)}`);
  }
  return response.json();
}

async function syncToFirebase() {
  console.log('🚀 Iniciando sincronização v3.1 com Firebase REST API...');

  try {
    // 1. Upload de Memórias
    if (fs.existsSync(MEMORIES_FILE)) {
      const memories = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf-8'));
      console.log(`📦 Processando ${memories.length} memórias...`);
      
      for (const m of memories) {
        // Gera slug limpo: minúsculo, sem acentos, sem espaços
        const slug = m.name.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, '_')
          .replace(/__+/g, '_')
          .replace(/^_|_$/g, '');
          
        console.log(`   - Fazendo upload de: ${m.name} [id: ${slug}]`);
        await uploadDoc('loot_table', slug, m);
      }
    }

    // 2. Upload de Bosses
    console.log(`\n👾 Processando ${NEW_BOSSES.length} novos bosses...`);
    for (const boss of NEW_BOSSES) {
      console.log(`   - Fazendo upload de: ${boss.data.name}`);
      await uploadDoc('boss_registry', boss.id, boss.data);
    }

    console.log('\n✅ Sincronização concluída com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro durante a sincronização:', error.message);
    process.exit(1);
  }
}

syncToFirebase();

