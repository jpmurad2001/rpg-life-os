const API_KEY = 'AIzaSyAgJNOvprLjiLIFf6ciKzDBU05b6ujEXB0';
const PROJECT_ID = 'shadow-slave-life-os';

async function checkLootTable() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/loot_table?key=${API_KEY}&pageSize=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

checkLootTable();
