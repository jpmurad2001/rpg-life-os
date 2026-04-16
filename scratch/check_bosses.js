const API_KEY = 'AIzaSyAgJNOvprLjiLIFf6ciKzDBU05b6ujEXB0';
const PROJECT_ID = 'shadow-slave-life-os';

async function checkBossRegistry() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/boss_registry?key=${API_KEY}&pageSize=2`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

checkBossRegistry();
